provider "aws" {
  region = var.aws_region
}

# Variables for customization
variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-east-2"
}

variable "aws_account_id" {
  description = "Your AWS account ID"
  type        = string
}

variable "domain_name" {
  description = "The root domain name (e.g. example.com)"
  type        = string
}

variable "app_subdomain" {
  description = "Subdomain for the application frontend"
  type        = string
  default     = "app"
}

variable "api_subdomain" {
  description = "Subdomain for the API"
  type        = string
  default     = "api"
}

variable "docs_subdomain" {
  description = "Subdomain for Documenso"
  type        = string
  default     = "docs"
}

variable "route53_zone_id" {
  description = "The Route53 zone ID for your domain"
  type        = string
}

variable "ec2_key_pair_name" {
  description = "Name of the EC2 key pair for SSH access"
  type        = string
  default     = "rentdaddy_key"
}

variable "backend_secret_arn" {
  description = "ARN for the AWS Secrets Manager secret containing backend credentials"
  type        = string
}

variable "documenso_secret_arn" {
  description = "ARN for the AWS Secrets Manager secret containing Documenso credentials"
  type        = string
}

variable "deploy_version" {
  description = "Version string or commit SHA used to force ECS task redeployments"
  type        = string
}

variable "debug_mode" {
  description = "Debug backend container startup in ECS"
  type        = string
  default     = "false"
}

variable "ecs_instance_size" {
  description = "EC2 instance type for ECS instances"
  type        = string
  default     = "t3.xlarge"
}

# Locals for derived values
locals {
  full_domain        = var.domain_name
  app_domain         = "${var.app_subdomain}.${var.domain_name}"
  api_domain         = "${var.api_subdomain}.${var.domain_name}"
  docs_domain        = "${var.docs_subdomain}.${var.domain_name}"
  ecr_backend_image  = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/rentdaddy/backend"
  ecr_frontend_image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/rentdaddy/frontend"
  ecr_postgres_image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/rentdaddy-main:postgres-15-amd64"
  # Infrastructure has been simplified to remove the documenso-worker component
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "rentdaddy-vpc"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = count.index == 0 ? "10.0.0.0/24" : "10.0.1.0/24"
  availability_zone       = count.index == 0 ? "${var.aws_region}a" : "${var.aws_region}b"
  map_public_ip_on_launch = true
  tags = {
    Name = "rentdaddy-public-${count.index}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "rentdaddy-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name = "rentdaddy-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "ec2_sg" {
  name        = "rentdaddy-ec2-sg"
  description = "Security group for ECS EC2 instances"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rentdaddy-ec2-sg"
  }
}

# IAM Roles
resource "aws_iam_role" "ecs_instance_role" {
  name = "rentdaddy-ecs-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance_role_attachment" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_instance_profile" {
  name = "rentdaddy-ecs-instance-profile"
  role = aws_iam_role.ecs_instance_role.name
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "rentdaddy-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Add Secrets Manager access
resource "aws_iam_role_policy_attachment" "ecs_task_secrets_manager_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend_logs" {
  name              = "/ecs/rentdaddy-backend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "frontend_logs" {
  name              = "/ecs/rentdaddy-frontend"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "documenso_logs" {
  name              = "/ecs/rentdaddy-documenso"
  retention_in_days = 7
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "rentdaddy-cluster"
}

# Launch Template for EC2 instances
resource "aws_launch_template" "ecs_lt" {
  name_prefix   = "rentdaddy-ecs-"
  image_id      = "ami-059601b8419c53014" # Amazon ECS-optimized Amazon Linux 2 AMI for us-east-2
  instance_type = var.ecs_instance_size
  key_name      = var.ec2_key_pair_name

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  vpc_security_group_ids = [aws_security_group.ec2_sg.id]


  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    
    # Create directories with proper permissions
    mkdir -p /home/ec2-user/app/{temp,postgres-data}
    mkdir -p /home/ec2-user/documenso/postgres-data
    
    # Set proper ownership and permissions for postgres data directory
    chown -R 999:999 /home/ec2-user/app/postgres-data
    chmod -R 700 /home/ec2-user/app/postgres-data
    
    # Make sure ec2-user owns other directories
    chown -R ec2-user:ec2-user /home/ec2-user/app/temp
    chown -R ec2-user:ec2-user /home/ec2-user/documenso
    echo "✅ User data script completed successfully" >> /var/log/user-data.log
    EOF
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp2"
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "rentdaddy-ecs-instance"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group for EC2 instances
resource "aws_autoscaling_group" "ecs_asg" {
  name                = "rentdaddy-ecs-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  desired_capacity    = 2
  min_size            = 2
  max_size            = 2

  # Connect to target groups for health checking and traffic routing
  target_group_arns = [
    aws_lb_target_group.frontend.arn,
    aws_lb_target_group.backend.arn,
    aws_lb_target_group.documenso.arn
  ]

  # Ensure we have one instance in each availability zone
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
    triggers = ["tag"]
  }

  launch_template {
    id      = aws_launch_template.ecs_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "rentdaddy-ecs-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "backend_with_frontend" {
  family                   = "rentdaddy-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "1024"
  memory                   = "3072"
  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${local.ecr_backend_image}:latest"
      essential = true
      links     = ["main-postgres"],
      environment = [
        # Database Configuration
        { name = "POSTGRES_PORT", value = "5432" },
        { name = "POSTGRES_HOST", value = "main-postgres" },
        { name = "POSTGRES_USER", value = "appuser" },
        { name = "POSTGRES_DB", value = "appdb" },
        # Server Configuration
        { name = "PORT", value = "8080" },
        { name = "DOMAIN_URL", value = "https://${local.app_domain}" },
        { name = "TEMP_DIR", value = "/app/temp" },
        # Frontend Configuration (for cross-service communication)
        { name = "FRONTEND_PORT", value = "5173" },
        # SMTP Configuration
        { name = "SMTP_PORT", value = "587" },
        { name = "SMTP_ENDPOINT_ADDRESS", value = "email-smtp.${var.aws_region}.amazonaws.com" },
        { name = "SMTP_TLS_MODE", value = "starttls" },
        { name = "SMTP_FROM", value = "ezra@gitfor.ge" },
        { name = "SMTP_TEST_EMAIL", value = "admin@${var.domain_name}" },
        # Documenso Integration
        { name = "DOCUMENSO_HOST", value = "documenso" },
        { name = "DOCUMENSO_PORT", value = "3000" },
        { name = "DOCUMENSO_API_URL", value = "https://${local.docs_domain}" },
        { name = "DOCUMENSO_PUBLIC_URL", value = "https://${local.docs_domain}" },
        # Admin information
        { name = "ADMIN_FIRST_NAME", value = "Ezra" },
        { name = "ADMIN_LAST_NAME", value = "Bot" },
        { name = "ADMIN_EMAIL", value = "ezrabot24@gmail.com" },
        # Application Environment
        { name = "ENV", value = "production" },
        { name = "DEBUG_MODE", value = var.debug_mode },
        # Force redeployment
        { name = "FORCE_REDEPLOY", value = var.deploy_version }
      ]
      portMappings = [{ containerPort = 8080, hostPort = 8080, protocol = "tcp" }]
      secrets = [
        { name = "CLERK_SECRET_KEY", valueFrom = "${var.backend_secret_arn}:CLERK_SECRET_KEY::" },
        { name = "CLERK_WEBHOOK", valueFrom = "${var.backend_secret_arn}:CLERK_WEBHOOK::" },
        { name = "ADMIN_CLERK_ID", valueFrom = "${var.backend_secret_arn}:ADMIN_CLERK_ID::" },
        { name = "VITE_CLERK_PUBLISHABLE_KEY", valueFrom = "${var.backend_secret_arn}:VITE_CLERK_PUBLISHABLE_KEY::" },
        # Database
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.backend_secret_arn}:POSTGRES_PASSWORD::" },
        { name = "PG_URL", valueFrom = "${var.backend_secret_arn}:PG_URL::" },
        # SMTP
        { name = "SMTP_USER", valueFrom = "${var.backend_secret_arn}:SMTP_USER::" },
        { name = "SMTP_PASSWORD", valueFrom = "${var.backend_secret_arn}:SMTP_PASSWORD::" },
        # Documenso
        { name = "DOCUMENSO_API_KEY", valueFrom = "${var.backend_secret_arn}:DOCUMENSO_API_KEY::" },
        { name = "DOCUMENSO_WEBHOOK_SECRET", valueFrom = "${var.backend_secret_arn}:DOCUMENSO_WEBHOOK_SECRET::" },
        # OpenAI (if needed)
        { name = "OPENAI_API_KEY", valueFrom = "${var.backend_secret_arn}:OPENAI_API_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }
      memoryReservation = 1024,
      memory            = 1536,
      healthCheck = {
        command     = ["CMD-SHELL", "wget -q -O - http://localhost:8080/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 120 # Keep the same start period
      }
    },
    {
      name         = "frontend"
      image        = "${local.ecr_frontend_image}:prod"
      essential    = true
      portMappings = [{ containerPort = 5173, hostPort = 5173, protocol = "tcp" }]
      environment = [
        # API configuration
        { name = "VITE_BACKEND_URL", value = "https://${local.api_domain}" },
        # Frontend Configuration
        { name = "FRONTEND_PORT", value = "5173" },
        # Optional Documenso integration
        { name = "VITE_DOCUMENSO_PUBLIC_URL", value = "https://${local.docs_domain}" },
        # Application Environment
        { name = "VITE_ENV", value = "production" },
        { name = "ENV", value = "production" },
        { name = "DEBUG_MODE", value = "false" },
        # Force redeployment
        { name = "FORCE_REDEPLOY", value = var.deploy_version }
      ]
      secrets = [
        # Clerk Authentication (Frontend only needs publishable key)
        { name = "VITE_CLERK_PUBLISHABLE_KEY", valueFrom = "${var.backend_secret_arn}:VITE_CLERK_PUBLISHABLE_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }
      memoryReservation = 512,
      memory            = 768,
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:5173/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      name      = "main-postgres"
      image     = local.ecr_postgres_image
      essential = true
      user      = "postgres"
      portMappings = [
        {
          containerPort = 5432,
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_USER", value = "appuser" },
        { name = "POSTGRES_DB", value = "appdb" },
        { name = "PGDATA", value = "/var/lib/postgresql/data/pgdata" },
        { name = "FORCE_REDEPLOY", value = var.deploy_version }
      ]
      secrets = [
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.backend_secret_arn}:POSTGRES_PASSWORD::" },
      ]
      mountPoints = [
        {
          sourceVolume  = "postgres-data"
          containerPath = "/var/lib/postgresql/data"
          readOnly      = false
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "postgres"
        }
      }
      memoryReservation = 512,
      memory            = 768,
      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U appuser || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
  ])

  volume {
    name      = "app-temp"
    host_path = "/home/ec2-user/app/temp"
  }

  volume {
    name = "postgres-data"
    docker_volume_configuration {
      scope         = "shared"
      autoprovision = true
      driver        = "local"
    }
  }
}

resource "aws_ecs_task_definition" "documenso" {
  family                   = "rentdaddy-documenso"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  cpu    = "768"
  memory = "2048"

  container_definitions = jsonencode([
    {
      name      = "documenso"
      image     = "documenso/documenso:latest"
      essential = true
      # Use a command that properly sets environment variables and runs migrations
      command = [
        "/bin/sh",
        "-c",
        "export CONTAINER_IP=$(hostname -i) && export NEXT_PRIVATE_INTERNAL_WEBAPP_URL=http://$CONTAINER_IP:3000 && export NEXT_PUBLIC_JOBS_URL=http://$CONTAINER_IP:3000/api/jobs && echo \"Container IP: $CONTAINER_IP\" && echo \"NEXT_PRIVATE_INTERNAL_WEBAPP_URL=$NEXT_PRIVATE_INTERNAL_WEBAPP_URL\" && echo \"NEXT_PUBLIC_JOBS_URL=$NEXT_PUBLIC_JOBS_URL\" && cd /app && npx prisma migrate deploy --schema ./packages/prisma/schema.prisma && node apps/web/server.js"
      ]
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      mountPoints = [
        {
          sourceVolume  = "documenso-cert"
          containerPath = "/opt/documenso"
          readOnly      = false
        }
      ]
      links = ["documenso-postgres"],
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "POSTGRES_USER", value = "documenso" },
        { name = "POSTGRES_DB", value = "documenso" },
        { name = "NEXT_PUBLIC_WEBAPP_URL", value = "https://${local.docs_domain}" },
        { name = "NEXTAUTH_URL", value = "https://${local.docs_domain}" },
        # These are placeholder values that will be overridden by command script
        { name = "NEXT_PRIVATE_INTERNAL_WEBAPP_URL", value = "http://localhost:3000" },
        { name = "NEXT_PUBLIC_JOBS_URL", value = "http://localhost:3000/api/jobs" },
        { name = "NEXT_PUBLIC_API_URL", value = "https://${local.docs_domain}" },
        { name = "NEXT_PRIVATE_SMTP_FROM_NAME", value = "RentDaddy" },
        { name = "SMTP_DEBUG", value = "true" },
        { name = "NEXT_PRIVATE_SMTP_TRANSPORT", value = "smtp-auth" },
        { name = "NEXT_PRIVATE_SMTP_SECURE", value = "false" },
        { name = "NEXT_PRIVATE_SMTP_HOST", value = "email-smtp.us-east-2.amazonaws.com" },
        { name = "NEXT_PRIVATE_SMTP_PORT", value = "587" },
        { name = "NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS", value = "false" },
        { name = "NEXT_PRIVATE_SMTP_IGNORE_TLS", value = "false" },
        { name = "NEXT_PRIVATE_SMTP_FROM_ADDRESS", value = "ezra@gitfor.ge" },
        { name = "NEXT_PRIVATE_SMTP_APIKEY_USER", value = "" },
        { name = "NEXT_PRIVATE_SMTP_APIKEY", value = "" },
        { name = "NEXT_PRIVATE_SMTP_SERVICE", value = "" },
        { name = "NEXT_PRIVATE_RESEND_API_KEY", value = "" },
        { name = "NEXT_PRIVATE_MAILCHANNELS_API_KEY", value = "" },
        { name = "NEXT_PRIVATE_MAILCHANNELS_ENDPOINT", value = "" },
        { name = "NEXT_PRIVATE_MAILCHANNELS_DKIM_DOMAIN", value = "" },
        { name = "NEXT_PRIVATE_MAILCHANNELS_DKIM_SELECTOR", value = "" },
        { name = "NEXT_PRIVATE_MAILCHANNELS_DKIM_PRIVATE_KEY", value = "" },
        { name = "PORT", value = "3000" },
        { name = "NEXT_PUBLIC_UPLOAD_TRANSPORT", value = "s3" },
        { name = "NEXT_PRIVATE_UPLOAD_BUCKET", value = "rentdaddydocumenso" },
        { name = "NEXT_PRIVATE_UPLOAD_ENDPOINT", value = "https://s3.us-east-1.amazonaws.com" },
        { name = "NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE", value = "false" },
        { name = "NEXT_PRIVATE_UPLOAD_REGION", value = "us-east-1" },
        { name = "NEXT_PUBLIC_MARKETING_URL", value = "https://${local.docs_domain}" },
        { name = "NEXT_PUBLIC_DISABLE_SIGNUP", value = "false" },
        { name = "NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT", value = "10" },
        { name = "NEXT_PUBLIC_POSTHOG_KEY", value = "" },
        { name = "NEXTAUTH_DEBUG", value = "true" },
        { name = "NEXT_LOG_LEVEL", value = "debug" },
        { name = "NEXTAUTH_COOKIE_DOMAIN", value = local.docs_domain },
        { name = "NEXTAUTH_COOKIE_SECURE", value = "true" },
        { name = "NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH", value = "/opt/documenso/cert.p12" },
        { name = "NEXT_PRIVATE_DATABASE_URL", value = "postgresql://documenso:password@documenso-postgres:5432/documenso" },
        { name = "NEXT_PRIVATE_DIRECT_DATABASE_URL", value = "postgresql://documenso:password@documenso-postgres:5432/documenso" },
        { name = "DATABASE_HOST", value = "documenso-postgres" },
        { name = "DATABASE_PORT", value = "5432" },
        { name = "FORCE_REDEPLOY", value = var.deploy_version },
        { name = "NEXT_PRIVATE_JOBS_PROVIDER", value = "local" },
        { name = "DEBUG", value = "true" },
        { name = "NODE_DEBUG", value = "email,tls" },
        { name = "NEXT_PRIVATE_JOBS_DEBUG", value = "true" }
      ]
      secrets = [
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.documenso_secret_arn}:POSTGRES_PASSWORD::" },
        { name = "NEXTAUTH_SECRET", valueFrom = "${var.documenso_secret_arn}:NEXTAUTH_SECRET::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_KEY", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_ENCRYPTION_KEY::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY::" },
        { name = "NEXT_PRIVATE_SIGNING_PASSPHRASE", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_SIGNING_PASSPHRASE::" },
        { name = "NEXT_PRIVATE_SMTP_USERNAME", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_SMTP_USERNAME::" },
        { name = "NEXT_PRIVATE_SMTP_PASSWORD", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_SMTP_PASSWORD::" },
        { name = "NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY::" },
        { name = "NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID", valueFrom = "${var.documenso_secret_arn}:NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.documenso_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "documenso"
        }
      }
      memoryReservation = 768,
      memory            = 1024,
      healthCheck = {
        command     = ["CMD-SHELL", "CONTAINER_IP=$(hostname -i) && wget -q -O - http://$CONTAINER_IP:3000/api/health || exit 1"]
        interval    = 60
        timeout     = 10
        retries     = 3
        startPeriod = 120
      }
    },
    {
      name      = "documenso-postgres"
      image     = "postgres:15"
      user      = "postgres"
      essential = true
      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U documenso || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      portMappings = [
        {
          containerPort = 5432,
          hostPort      = 5433,
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_USER", value = "documenso" },
        { name = "POSTGRES_DB", value = "documenso" },
        { name = "PGDATA", value = "/var/lib/postgresql/data/pgdata" },
        { name = "FORCE_REDEPLOY", value = var.deploy_version },
      ]
      secrets = [
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.documenso_secret_arn}:POSTGRES_PASSWORD::" },
      ]
      mountPoints = [
        {
          sourceVolume  = "documenso-postgres-data"
          containerPath = "/var/lib/postgresql/data"
          readOnly      = false
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.documenso_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "postgres"
        }
      }
      memoryReservation = 512,
      memory            = 768,
    }
    # Note: The documenso-worker container definition has been removed
    # Direct API integration and webhook handling is now done directly through the backend without a worker component
  ])

  volume {
    name = "documenso-postgres-data"
    docker_volume_configuration {
      scope         = "shared"
      autoprovision = true
      driver        = "local"
    }
  }

  volume {
    name = "documenso-cert"
    docker_volume_configuration {
      scope         = "shared"
      autoprovision = true
      driver        = "local"
    }
  }
}

# ECS Services
resource "aws_ecs_service" "backend_with_frontend" {
  name                               = "rentdaddy-app-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.backend_with_frontend.arn
  desired_count                      = 1
  health_check_grace_period_seconds  = 180
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  # Keep app service in availability zone a to ensure separation from documenso
  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.availability-zone == ${var.aws_region}a"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "documenso" {
  name                               = "rentdaddy-documenso-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.documenso.arn
  desired_count                      = 1
  health_check_grace_period_seconds  = 300
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.documenso.arn
    container_name   = "documenso"
    container_port   = 3000
  }

  # Keep documenso service in availability zone b to ensure separation from main app
  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.availability-zone == ${var.aws_region}b"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Elastic IPs
resource "aws_eip" "main_app_eip" {
  domain = "vpc"
  tags = {
    Name = "rentdaddy-main-app-eip"
  }
}

# Get a list of ECS instances
data "aws_instances" "ecs_instances" {
  filter {
    name   = "tag:AmazonECSManaged"
    values = [""]
  }

  depends_on = [
    aws_autoscaling_group.ecs_asg
  ]
}

# Get instance in availability zone A (for main app)
data "aws_instances" "zone_a_instances" {
  filter {
    name   = "availability-zone"
    values = ["${var.aws_region}a"]
  }

  filter {
    name   = "tag:AmazonECSManaged"
    values = [""]
  }

  depends_on = [
    aws_autoscaling_group.ecs_asg
  ]
}

# Associate EIP with the instance in availability zone A
resource "aws_eip_association" "main_app_eip_assoc" {
  count         = length(data.aws_instances.zone_a_instances.ids) > 0 ? 1 : 0
  allocation_id = aws_eip.main_app_eip.id
  instance_id   = data.aws_instances.zone_a_instances.ids[0]
}

# Route 53 Configuration
data "aws_route53_zone" "main" {
  zone_id      = var.route53_zone_id
  private_zone = false
}

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  validation_method         = "DNS"
  subject_alternative_names = ["*.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "rentdaddy-cert"
  }
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "rentdaddy-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.ec2_sg.id]

  tags = {
    Name = "rentdaddy-alb"
  }
}

# Target Groups
resource "aws_lb_target_group" "frontend" {
  name        = "frontend-tg"
  port        = 5173
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/healthz"
    matcher             = "200-299"
    interval            = 60
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "backend-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/healthz"
    matcher             = "200-299"
    interval            = 60
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "documenso" {
  name        = "documenso-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = "/"
    interval            = 300
    timeout             = 60
    healthy_threshold   = 2
    unhealthy_threshold = 10
    matcher             = "200-499"
  }
}

# Load Balancer Listeners
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.main.arn

  depends_on = [aws_acm_certificate_validation.cert]

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 110

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    host_header {
      values = [local.api_domain]
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    host_header {
      values = [local.app_domain]
    }
  }
}

resource "aws_lb_listener_rule" "redirect_to_app" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
      host        = local.app_domain
    }
  }

  condition {
    host_header {
      values = [var.domain_name]
    }
  }
}

resource "aws_lb_listener_rule" "documenso" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.documenso.arn
  }

  condition {
    host_header {
      values = [local.docs_domain]
    }
  }
}

# Route53 Records
resource "aws_route53_record" "docs_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.docs_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.app_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "apex_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Service Discovery for ECS Services
resource "aws_service_discovery_private_dns_namespace" "rentdaddy" {
  name        = "rentdaddy.local"
  description = "Private namespace for service discovery"
  vpc         = aws_vpc.main.id
}

# Outputs
output "instance_ids" {
  description = "IDs of the EC2 instances"
  value       = data.aws_instances.ecs_instances.ids
}

output "elastic_ip" {
  description = "Elastic IP for the application"
  value       = aws_eip.main_app_eip.public_ip
}

output "nameservers" {
  description = "Nameservers for the Route 53 zone"
  value       = data.aws_route53_zone.main.name_servers
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "URL for the application frontend"
  value       = "https://${local.app_domain}"
}

output "api_url" {
  description = "URL for the API"
  value       = "https://${local.api_domain}"
}

output "docs_url" {
  description = "URL for Documenso"
  value       = "https://${local.docs_domain}"
}




resource "aws_route53_record" "clerk_api" {
  zone_id = "Z037567331JOV8D5N3ZVT"
  name    = "clerk.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["frontend-api.clerk.services"]
}

resource "aws_route53_record" "clerk_accounts" {
  zone_id = "Z037567331JOV8D5N3ZVT"
  name    = "accounts.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["accounts.clerk.services"]
}

resource "aws_route53_record" "clerk_dkim1" {
  zone_id = "Z037567331JOV8D5N3ZVT"
  name    = "clk._domainkey.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["dkim1.fpd2ed3v56gb.clerk.services"]
}

resource "aws_route53_record" "clerk_dkim2" {
  zone_id = "Z037567331JOV8D5N3ZVT"
  name    = "clk2._domainkey.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["dkim2.fpd2ed3v56gb.clerk.services"]
}

resource "aws_route53_record" "clerk_mail" {
  zone_id = "Z037567331JOV8D5N3ZVT"
  name    = "clkmail.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["mail.fpd2ed3v56gb.clerk.services"]
}
