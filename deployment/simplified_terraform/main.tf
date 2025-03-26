provider "aws" {
  region = "us-east-2"
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
  availability_zone       = count.index == 0 ? "us-east-2a" : "us-east-2b"
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
    to_port     = 5433
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
  instance_type = "t3.small"
  key_name      = "rentdaddy_key"

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    mkdir -p /home/ec2-user/app/{temp,postgres-data}
    mkdir -p /home/ec2-user/documenso/postgres-data
    chown -R ec2-user:ec2-user /home/ec2-user
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
  desired_capacity    = 1
  min_size            = 1
  max_size            = 2

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
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/backend:latest"
      essential = true
      environment = [
        { name = "POSTGRES_HOST", value = "main-postgres.rentdaddy.local" },
        { name = "VITE_CLERK_PUBLISHABLE_KEY", value = "pk_test_ZXF1YWwtaWd1YW5hLTgwLmNsZXJrLmFjY291bnRzLmRldiQ" },
        { name = "CLERK_WEBHOOK", value = "whsec_9dYgX/L5GlKgkejOh9cYSEtDTgbjVm8X" },
        { name = "CLERK_LANDLORD_USER_ID", value = "user_2uciuYs8U4OAzq7ysVjOP7qWfbJ" },
        { name = "VITE_PORT", value = "8080" },
        { name = "VITE_DOMAIN_URL", value = "http://localhost" },
        { name = "PORT", value = "8080" },
        { name = "DOMAIN_URL", value = "http://localhost" },
        { name = "TEMP_DIR", value = "/app/temp" },
        { name = "ADMIN_FIRST_NAME", value = "First Landlord" },
        { name = "ADMIN_LAST_NAME", value = "First Landlord" },
        { name = "ADMIN_EMAIL", value = "rentdaddyadmin@gitfor.ge" },
        { name = "FRONTEND_PORT", value = "5173" },
        { name = "SMTP_PORT", value = "587" },
        { name = "SMTP_ENDPOINT_ADDRESS", value = "email-smtp.us-east-2.amazonaws.com" },
        { name = "SMTP_USER", value = "AKIAZ7SAK3WXHK5TJ2Y7" },
        { name = "SMTP_TLS_MODE", value = "starttls" },
        { name = "SMTP_FROM", value = "rentdaddyadmin@gitfor.ge" },
        { name = "SMTP_TEST_EMAIL", value = "rentdaddyadmin@gitfor.ge" },
        { name = "s3Region", value = "us-east-1" },
        { name = "s3Bucket", value = "rentdaddydocumenso" },
        { name = "s3BaseURL", value = "https://s3.us-east-1.amazonaws.com" },
        { name = "awsAccessID", value = "AKIASOMWUJVJOJ63YFFE" },
        { name = "DOCUMENSO_HOST", value = "documenso" },
        { name = "DOCUMENSO_PORT", value = "3000" },
        { name = "DOCUMENSO_API_URL", value = "http://documenso:3000" },
        { name = "DOCUMENSO_PUBLIC_URL", value = "http://localhost:3000" },
        { name = "ENV", value = "development" },
        { name = "DEBUG_MODE", value = "false" }
      ]
      portMappings = [{ containerPort = 8080, protocol = "tcp" }]
      secrets = [
        { name = "CLERK_SECRET_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:CLERK_SECRET_KEY::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_PASSWORD::" },
        { name = "SMTP_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:SMTP_PASSWORD::" },
        { name = "awsSecret", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:awsSecret::" },
        { name = "DOCUMENSO_API_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:DOCUMENSO_API_KEY::" },
        { name = "DOCUMENSO_WEBHOOK_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:DOCUMENSO_WEBHOOK_SECRET::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend_logs.name
          awslogs-region        = "us-east-2"
          awslogs-stream-prefix = "backend"
        }
      }
    },
    {
      name         = "frontend"
      image        = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/frontend:latest"
      essential    = true
      portMappings = [{ containerPort = 5173, protocol = "tcp" }]
      environment = [
        { name = "CLERK_WEBHOOK", value = "whsec_9dYgX/L5GlKgkejOh9cYSEtDTgbjVm8X" },
        { name = "CLERK_LANDLORD_USER_ID", value = "user_2uciuYs8U4OAzq7ysVjOP7qWfbJ" },
        { name = "VITE_PORT", value = "8080" },
        { name = "VITE_DOMAIN_URL", value = "http://localhost" },
        { name = "PORT", value = "8080" },
        { name = "DOMAIN_URL", value = "http://localhost" },
        { name = "ADMIN_FIRST_NAME", value = "First Landlord" },
        { name = "ADMIN_LAST_NAME", value = "First Landlord" },
        { name = "ADMIN_EMAIL", value = "rentdaddyadmin@gitfor.ge" },
        { name = "FRONTEND_PORT", value = "5173" },
        { name = "ENV", value = "development" },
        { name = "DEBUG_MODE", value = "false" }
      ]
      secrets = [
        { name = "VITE_CLERK_PUBLISHABLE_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:VITE_CLERK_PUBLISHABLE_KEY::" },
        { name = "CLERK_SECRET_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:CLERK_SECRET_KEY::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend_logs.name
          awslogs-region        = "us-east-2"
          awslogs-stream-prefix = "frontend"
        }
      }
    }
  ])

  volume {
    name      = "app-temp"
    host_path = "/home/ec2-user/app/temp"
  }
}

resource "aws_ecs_task_definition" "documenso" {
  family                   = "rentdaddy-documenso"
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  cpu    = "512"
  memory = "1024"

  container_definitions = jsonencode([
    {
      name      = "documenso"
      image     = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/documenso:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "POSTGRES_USER", value = "documenso" },
        { name = "POSTGRES_DB", value = "documenso" },
        { name = "POSTGRES_HOST", value = "10.0.0.107" },
        { name = "NEXT_PUBLIC_WEBAPP_URL", value = "http://localhost:3000" },
        { name = "NEXT_PRIVATE_INTERNAL_WEBAPP_URL", value = "http://documenso:3000" },
        { name = "NEXT_PRIVATE_SMTP_FROM_NAME", value = "RentDaddy" },
        { name = "NEXT_PRIVATE_SMTP_TRANSPORT", value = "smtp-auth" },
        { name = "NEXT_PRIVATE_SMTP_USERNAME", value = "AKIAZ7SAK3WXHK5TJ2Y7" },
        { name = "NEXT_PRIVATE_SMTP_SECURE", value = "false" },
        { name = "NEXT_PRIVATE_SMTP_HOST", value = "email-smtp.us-east-2.amazonaws.com" },
        { name = "NEXT_PRIVATE_SMTP_PORT", value = "587" },
        { name = "NEXT_PRIVATE_SMTP_FROM_ADDRESS", value = "rentdaddyadmin@gitfor.ge" },
        { name = "PORT", value = "3000" },
        { name = "NEXT_PUBLIC_UPLOAD_TRANSPORT", value = "s3" },
        { name = "NEXT_PRIVATE_UPLOAD_BUCKET", value = "rentdaddydocumenso" },
        { name = "NEXT_PRIVATE_UPLOAD_ENDPOINT", value = "https://s3.us-east-1.amazonaws.com" },
        { name = "NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE", value = "false" },
        { name = "NEXT_PRIVATE_UPLOAD_REGION", value = "us-east-1" },
        { name = "NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID", value = "AKIASOMWUJVJM34XMXUN" },
        { name = "POSTGRES_HOST", value = "main-postgres.rentdaddy.local" },
      ]
      secrets = [
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:POSTGRES_PASSWORD::" },
        { name = "NEXTAUTH_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXTAUTH_SECRET::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_ENCRYPTION_KEY::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY::" },
        { name = "NEXT_PRIVATE_SIGNING_PASSPHRASE", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SIGNING_PASSPHRASE::" },
        { name = "NEXT_PRIVATE_SMTP_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_PASSWORD::" },
        { name = "NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.documenso_logs.name
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "documenso"
        }
      }
    }
  ])
}



# PostgreSQL containers for both apps
resource "aws_ecs_task_definition" "main_postgres" {
  family       = "rentdaddy-main-postgres"
  network_mode = "awsvpc"

  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  cpu    = "256"
  memory = "512"

  container_definitions = jsonencode([
    {
      name      = "main-postgres"
      image     = "postgres:15"
      essential = true

      portMappings = [
        {
          containerPort = 5432,
          hostPort      = 5432, # Add explicit host port 
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_HOST", value = "main-postgres.rentdaddy.local" },
      ]
      secrets = [
        {
          name      = "POSTGRES_USER"
          valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_USER::"
        },
        {
          name      = "POSTGRES_PASSWORD"
          valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_PASSWORD::"
        },
        {
          name      = "POSTGRES_DB"
          valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_DB::"
        }
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
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "postgres"
        }
      }
    },
  ])

  volume {
    name      = "postgres-data"
    host_path = "/home/ec2-user/app/postgres-data"
  }
}
resource "aws_ecs_task_definition" "documenso_postgres" {
  family       = "rentdaddy-documenso-postgres"
  network_mode = "awsvpc"

  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn

  cpu    = "256"
  memory = "512"

  container_definitions = jsonencode([
    {
      name      = "documenso-postgres"
      image     = "postgres:15"
      essential = true
      portMappings = [
        {
          containerPort = 5433,
          hostPort      = 5433, # Add explicit host port 
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_HOST", value = "main-postgres.rentdaddy.local" },
      ]
      secrets = [
        { name = "POSTGRES_USER", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:POSTGRES_DB::" },
        { name = "NEXTAUTH_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXTAUTH_SECRET::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_ENCRYPTION_KEY::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY::" },
        { name = "NEXT_PUBLIC_WEBAPP_URL", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PUBLIC_WEBAPP_URL::" },
        { name = "NEXT_PRIVATE_INTERNAL_WEBAPP_URL", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_INTERNAL_WEBAPP_URL::" },
        { name = "NEXT_PRIVATE_SIGNING_PASSPHRASE", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SIGNING_PASSPHRASE::" },
        { name = "NEXT_PRIVATE_SMTP_FROM_NAME", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_FROM_NAME::" },
        { name = "NEXT_PRIVATE_SMTP_TRANSPORT", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_TRANSPORT::" },
        { name = "NEXT_PRIVATE_SMTP_USERNAME", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_USERNAME::" },
        { name = "NEXT_PRIVATE_SMTP_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_PASSWORD::" },
        { name = "NEXT_PRIVATE_SMTP_SECURE", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_SECURE::" },
        { name = "NEXT_PRIVATE_SMTP_HOST", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_HOST::" },
        { name = "NEXT_PRIVATE_SMTP_PORT", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_PORT::" },
        { name = "NEXT_PRIVATE_SMTP_FROM_ADDRESS", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_SMTP_FROM_ADDRESS::" },
        { name = "NEXT_PRIVATE_DATABASE_URL", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_DATABASE_URL::" },
        { name = "NEXT_PRIVATE_DIRECT_DATABASE_URL", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_DIRECT_DATABASE_URL::" },
        { name = "PORT", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:PORT::" },
        { name = "NEXT_PUBLIC_UPLOAD_TRANSPORT", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PUBLIC_UPLOAD_TRANSPORT::" },
        { name = "NEXT_PRIVATE_UPLOAD_BUCKET", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_BUCKET::" },
        { name = "NEXT_PRIVATE_UPLOAD_ENDPOINT", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_ENDPOINT::" },
        { name = "NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE::" },
        { name = "NEXT_PRIVATE_UPLOAD_REGION", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_REGION::" },
        { name = "NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID::" },
        { name = "NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY::" }
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
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "postgres"
        }
      }
    }
  ])


  volume {
    name      = "documenso-postgres-data"
    host_path = "/home/ec2-user/documenso/postgres-data"
  }
}

# ECS Services
resource "aws_ecs_service" "backend_with_frontend" {
  name            = "rentdaddy-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend_with_frontend.arn
  desired_count   = 1

  enable_execute_command = true
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ec2_sg.id]
    assign_public_ip = false
  }
  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }
  service_registries {
    registry_arn   = aws_service_discovery_service.documenso.arn
    container_name = "documenso"
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}


resource "aws_ecs_service" "documenso" {
  name            = "rentdaddy-documenso-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.documenso.arn
  desired_count   = 1
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ec2_sg.id]
    assign_public_ip = false
  }
  enable_execute_command = true
  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "main_postgres" {
  name            = "rentdaddy-main-postgres-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main_postgres.arn
  desired_count   = 1

  enable_execute_command = true
  network_configuration {
    subnets         = aws_subnet.public[*].id
    security_groups = [aws_security_group.ec2_sg.id]
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.main_postgres.arn
    container_name = "main-postgres"
  }

  depends_on = [aws_lb_listener.https]
  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}
resource "aws_ecs_service" "documenso_postgres" {
  name            = "rentdaddy-documenso-postgres-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.documenso_postgres.arn
  desired_count   = 1

  enable_execute_command = true


  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ec2_sg.id]
    assign_public_ip = false
  }

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
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

# Create a script in user_data to associate EIP
data "aws_instances" "ecs_instances" {
  filter {
    name   = "tag:AmazonECSManaged"
    values = [""]
  }

  depends_on = [
    aws_autoscaling_group.ecs_asg
  ]
}

# Route 53
data "aws_route53_zone" "main" {
  zone_id      = "Z037567331JOV8D5N3ZVT"
  private_zone = false

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
resource "aws_acm_certificate" "main" {
  domain_name       = "app.curiousdev.net"
  validation_method = "DNS"

  subject_alternative_names = [
    "docs.curiousdev.net"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "rentdaddy-cert"
  }
}

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

resource "aws_lb_target_group" "frontend" {
  name        = "frontend-tg"
  port        = 5173
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"


  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "backend-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "documenso" {
  name        = "documenso-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

# resource "aws_lb_target_group_attachment" "frontend" {
#   count            = length(data.aws_instances.ecs_instances.ids)
#   target_group_arn = aws_lb_target_group.frontend.arn
#   target_id        = data.aws_instances.ecs_instances.ids[count.index]
#   port             = 5173
# }

# resource "aws_lb_target_group_attachment" "backend" {
#   count            = length(data.aws_instances.ecs_instances.ids)
#   target_group_arn = aws_lb_target_group.backend.arn
#   target_id        = data.aws_instances.ecs_instances.ids[count.index]
#   port             = 8080
# }

# resource "aws_lb_target_group_attachment" "documenso" {
#   count            = length(data.aws_instances.ecs_instances.ids)
#   target_group_arn = aws_lb_target_group.documenso.arn
#   target_id        = data.aws_instances.ecs_instances.ids[count.index]
#   port             = 3000
# }
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:us-east-2:168356498770:certificate/6951445e-b587-4a56-8d8a-aae2e8a1fa1c"

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
      values = ["api.curiousdev.net"] # or change to whatever backend domain you want
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
      values = ["app.curiousdev.net"]
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
      values = ["docs.curiousdev.net"]
    }
  }
}
resource "aws_route53_record" "docs_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "docs.curiousdev.net"
  type    = "A"
  ttl     = 300
  records = ["3.148.114.36"]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route53_record" "acm_validation_docs" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_3202e4d9e072fd2a55853a587e6c3cde.docs.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["_34117048b6acc0aa84239bc4fc1dd1a1.xlfgrmvvlj.acm-validations.aws"]

  lifecycle {
    prevent_destroy = true
  }
}


resource "aws_route53_record" "app_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.curiousdev.net"
  type    = "A"
  ttl     = 300
  records = ["18.222.116.146"]
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route53_record" "validate_app_cert" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_26feeea980e5b9a570740aea36c08250.app.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["_e3388d6accc1c6e5f41d5c8851d98a40.xlfgrmvvlj.acm-validations.aws"]
  lifecycle {
    prevent_destroy = true
  }
}


resource "aws_service_discovery_private_dns_namespace" "rentdaddy" {
  name        = "rentdaddy.local"
  description = "Private namespace for service discovery"
  vpc         = aws_vpc.main.id
}


resource "aws_service_discovery_service" "main_postgres" {
  name = "main-postgres"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.rentdaddy.id

    dns_records {
      type = "A"
      ttl  = 10
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "documenso" {
  name = "documenso"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.rentdaddy.id

    dns_records {
      type = "A"
      ttl  = 10
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
