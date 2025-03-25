# main.tf
provider "aws" {
  region = var.aws_region
}

# Attach capacity providers to ECS cluster
resource "aws_ecs_cluster_capacity_providers" "rentdaddy_cluster_capacity_providers" {
  cluster_name = aws_ecs_cluster.rentdaddy_cluster.name

  capacity_providers = [
    aws_ecs_capacity_provider.main_app_capacity_provider.name,
    aws_ecs_capacity_provider.documenso_capacity_provider.name
  ]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = aws_ecs_capacity_provider.main_app_capacity_provider.name
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "main_app_logs" {
  name              = "/ecs/rentdaddy-main-app"
  retention_in_days = 7

  tags = {
    Name = "rentdaddy-main-app-logs"
  }
}

resource "aws_cloudwatch_log_group" "documenso_logs" {
  name              = "/ecs/rentdaddy-documenso"
  retention_in_days = 7

  tags = {
    Name = "rentdaddy-documenso-logs"
  }
}

# Task Definitions
# Main Application Task Definition
resource "aws_ecs_task_definition" "main_app" {
  family                   = "rentdaddy-main-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "512"
  memory                   = "900"

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${var.ecr_repository_url}:backend-latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "PORT", value = "8080" },
        { name = "DOMAIN_URL", value = "http://#{HOST}" },
        { name = "TEMP_DIR", value = "/app/temp" },
        { name = "PG_URL", value = "postgresql://#{AWS_SECRETS:POSTGRES_USER}:#{AWS_SECRETS:POSTGRES_PASSWORD}@postgres:5432/#{AWS_SECRETS:POSTGRES_DB}" },
        { name = "ENV", value = "production" }
      ]
      secrets = [
        { name = "CLERK_SECRET_KEY", valueFrom = "${var.secrets_arn}:CLERK_SECRET_KEY::" },
        { name = "CLERK_WEBHOOK", valueFrom = "${var.secrets_arn}:CLERK_WEBHOOK::" },
        { name = "POSTGRES_USER", valueFrom = "${var.secrets_arn}:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.secrets_arn}:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "${var.secrets_arn}:POSTGRES_DB::" },
        { name = "DOCUMENSO_API_KEY", valueFrom = "${var.secrets_arn}:DOCUMENSO_API_KEY::" },
        { name = "DOCUMENSO_WEBHOOK_SECRET", valueFrom = "${var.secrets_arn}:DOCUMENSO_WEBHOOK_SECRET::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      mountPoints = [
        {
          sourceVolume  = "app-temp"
          containerPath = "/app/temp"
          readOnly      = false
        }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      name      = "frontend"
      image     = "${var.ecr_repository_url}:frontend-latest"
      essential = true
      portMappings = [
        {
          containerPort = 5173
          hostPort      = 5173
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "VITE_PORT", value = "5173" },
        { name = "VITE_DOMAIN_URL", value = "http://#{HOST}" }
      ]
      secrets = [
        { name = "VITE_CLERK_PUBLISHABLE_KEY", valueFrom = "${var.secrets_arn}:VITE_CLERK_PUBLISHABLE_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:5173/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      name      = "postgres"
      image     = "postgres:14-alpine"
      essential = true
      portMappings = [
        {
          containerPort = 5432
          hostPort      = 5432
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_USER", value = "#{AWS_SECRETS:POSTGRES_USER}" },
        { name = "POSTGRES_PASSWORD", value = "#{AWS_SECRETS:POSTGRES_PASSWORD}" },
        { name = "POSTGRES_DB", value = "#{AWS_SECRETS:POSTGRES_DB}" }
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
          "awslogs-group"         = aws_cloudwatch_log_group.main_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "postgres"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U #{AWS_SECRETS:POSTGRES_USER}"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  volume {
    name      = "app-temp"
    host_path = "/home/ec2-user/app/temp"
  }

  volume {
    name      = "postgres-data"
    host_path = "/home/ec2-user/app/postgres-data"
  }

  tags = {
    Name = "rentdaddy-main-app"
  }
}

# Documenso Task Definition
resource "aws_ecs_task_definition" "documenso" {
  family                   = "rentdaddy-documenso"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "1024"
  memory                   = "1800"

  container_definitions = jsonencode([
    {
      name      = "documenso"
      image     = "${var.documenso_image}"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "PORT", value = "3000" },
        { name = "NODE_ENV", value = "production" }
      ]
      secrets = [
        { name = "NEXTAUTH_SECRET", valueFrom = "${var.secrets_arn}:NEXTAUTH_SECRET::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_KEY", valueFrom = "${var.secrets_arn}:NEXT_PRIVATE_ENCRYPTION_KEY::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY", valueFrom = "${var.secrets_arn}:NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY::" },
        { name = "POSTGRES_USER", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_DB::" },
        { name = "DATABASE_URL", valueFrom = "${var.secrets_arn}:DOCUMENSO_DATABASE_URL::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.documenso_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "documenso"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      name      = "postgres"
      image     = "postgres:14-alpine"
      essential = true
      portMappings = [
        {
          containerPort = 5432
          hostPort      = 5433
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_USER", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_USER}" },
        { name = "POSTGRES_PASSWORD", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_PASSWORD}" },
        { name = "POSTGRES_DB", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_DB}" }
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
      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U #{AWS_SECRETS:DOCUMENSO_POSTGRES_USER} -p 5432"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  volume {
    name      = "documenso-postgres-data"
    host_path = "/home/ec2-user/documenso/postgres-data"
  }

  tags = {
    Name = "rentdaddy-documenso"
  }
}

# ECS Services
resource "aws_ecs_service" "main_app_service" {
  name            = "rentdaddy-main-app-service"
  cluster         = aws_ecs_cluster.rentdaddy_cluster.id
  task_definition = aws_ecs_task_definition.main_app.arn
  desired_count   = 1
  launch_type     = "EC2"

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main_app_capacity_provider.name
    weight            = 100
    base              = 1
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "rentdaddy-main-app-service"
  }
}

resource "aws_ecs_service" "documenso_service" {
  name            = "rentdaddy-documenso-service"
  cluster         = aws_ecs_cluster.rentdaddy_cluster.id
  task_definition = aws_ecs_task_definition.documenso.arn
  desired_count   = 1
  launch_type     = "EC2"

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.documenso_capacity_provider.name
    weight            = 100
    base              = 1
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "rentdaddy-documenso-service"
  }
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "main_app_cpu_high" {
  alarm_name          = "rentdaddy-main-app-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors ec2 cpu utilization for main app"
  alarm_actions       = []

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main_app_asg.name
  }
}

resource "aws_cloudwatch_metric_alarm" "documenso_cpu_high" {
  alarm_name          = "rentdaddy-documenso-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors ec2 cpu utilization for documenso"
  alarm_actions       = []

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.documenso_asg.name
  }
}

# S3 Bucket for application files and backups
resource "aws_s3_bucket" "rentdaddy_bucket" {
  bucket = var.s3_bucket_name

  tags = {
    Name = "rentdaddy-bucket"
  }
}

resource "aws_s3_bucket_ownership_controls" "rentdaddy_bucket_ownership" {
  bucket = aws_s3_bucket.rentdaddy_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "rentdaddy_bucket_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.rentdaddy_bucket_ownership]

  bucket = aws_s3_bucket.rentdaddy_bucket.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "rentdaddy_bucket_versioning" {
  bucket = aws_s3_bucket.rentdaddy_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# IAM policy for accessing S3
resource "aws_iam_policy" "s3_access_policy" {
  name        = "rentdaddy-s3-access-policy"
  description = "Policy for accessing S3 buckets for RentDaddy application"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.rentdaddy_bucket.arn,
          "${aws_s3_bucket.rentdaddy_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_s3_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

# Backup policy for ECS task definitions
resource "aws_backup_plan" "ecs_backup_plan" {
  name = "rentdaddy-ecs-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.ecs_backup_vault.name
    schedule          = "cron(0 1 * * ? *)"

    lifecycle {
      delete_after = 30
    }
  }

  tags = {
    Name = "rentdaddy-ecs-backup-plan"
  }
}

resource "aws_backup_vault" "ecs_backup_vault" {
  name = "rentdaddy-ecs-backup-vault"

  tags = {
    Name = "rentdaddy-ecs-backup-vault"
  }
}

resource "aws_backup_selection" "ecs_backup_selection" {
  name         = "rentdaddy-ecs-backup-selection"
  iam_role_arn = aws_iam_role.backup_role.arn
  plan_id      = aws_backup_plan.ecs_backup_plan.id

  resources = [
    aws_ecs_task_definition.main_app.arn,
    aws_ecs_task_definition.documenso.arn
  ]
}

resource "aws_iam_role" "backup_role" {
  name = "rentdaddy-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# Scheduled task for database backups
resource "aws_cloudwatch_event_rule" "daily_backup_rule" {
  name                = "rentdaddy-daily-backup"
  description         = "Triggers daily database backups"
  schedule_expression = "cron(0 2 * * ? *)"
}

resource "aws_cloudwatch_event_target" "main_app_backup_target" {
  rule      = aws_cloudwatch_event_rule.daily_backup_rule.name
  target_id = "main-app-backup"
  arn       = aws_ecs_cluster.rentdaddy_cluster.arn

  ecs_target {
    launch_type         = "EC2"
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.backup_task.arn
  }

  input = jsonencode({
    containerOverrides = [
      {
        name    = "backup-container"
        command = ["/scripts/backup-main-db.sh"]
      }
    ]
  })
}

resource "aws_cloudwatch_event_target" "documenso_backup_target" {
  rule      = aws_cloudwatch_event_rule.daily_backup_rule.name
  target_id = "documenso-backup"
  arn       = aws_ecs_cluster.rentdaddy_cluster.arn

  ecs_target {
    launch_type         = "EC2"
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.backup_task.arn
  }

  input = jsonencode({
    containerOverrides = [
      {
        name    = "backup-container"
        command = ["/scripts/backup-documenso-db.sh"]
      }
    ]
  })
}

# Backup task definition
resource "aws_ecs_task_definition" "backup_task" {
  family                   = "rentdaddy-backup-task"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "backup-container"
      image     = "postgres:14-alpine"
      essential = true
      command   = ["/scripts/backup.sh"]

      environment = [
        { name = "S3_BUCKET", value = var.s3_bucket_name },
        { name = "AWS_REGION", value = var.aws_region }
      ]

      secrets = [
        { name = "POSTGRES_USER", valueFrom = "${var.secrets_arn}:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.secrets_arn}:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "${var.secrets_arn}:POSTGRES_DB::" },
        { name = "AWS_ACCESS_KEY_ID", valueFrom = "${var.secrets_arn}:AWS_ACCESS_KEY_ID::" },
        { name = "AWS_SECRET_ACCESS_KEY", valueFrom = "${var.secrets_arn}:AWS_SECRET_ACCESS_KEY::" }
      ]

      mountPoints = [
        {
          sourceVolume  = "scripts"
          containerPath = "/scripts"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backup"
        }
      }
    }
  ])

  volume {
    name      = "scripts"
    host_path = "/home/ec2-user/backup-scripts"
  }

  tags = {
    Name = "rentdaddy-backup-task"
  }
}

# Network resources
resource "aws_vpc" "rentdaddy_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "rentdaddy-vpc"
  }
}

resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.rentdaddy_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "rentdaddy-public-subnet-a"
  }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.rentdaddy_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "rentdaddy-public-subnet-b"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.rentdaddy_vpc.id

  tags = {
    Name = "rentdaddy-igw"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.rentdaddy_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "rentdaddy-public-rt"
  }
}

resource "aws_route_table_association" "public_rta_a" {
  subnet_id      = aws_subnet.public_subnet_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_rta_b" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Groups
resource "aws_security_group" "main_app_sg" {
  name        = "rentdaddy-main-sg"
  description = "Security group for main application"
  vpc_id      = aws_vpc.rentdaddy_vpc.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend access (Vite dev server)
  ingress {
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API access
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL access from within VPC
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.rentdaddy_vpc.cidr_block]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rentdaddy-main-sg"
  }
}

resource "aws_security_group" "documenso_sg" {
  name        = "rentdaddy-documenso-sg"
  description = "Security group for Documenso service"
  vpc_id      = aws_vpc.rentdaddy_vpc.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Documenso service access
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL access from within VPC
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.rentdaddy_vpc.cidr_block]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rentdaddy-documenso-sg"
  }
}

# IAM roles for ECS
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

resource "aws_iam_role_policy_attachment" "ecs_instance_role_policy" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ecs_instance_cw_policy" {
  role       = aws_iam_role.ecs_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ecs_instance_profile" {
  name = "rentdaddy-ecs-instance-profile"
  role = aws_iam_role.ecs_instance_role.name
}

# ECS Cluster
resource "aws_ecs_cluster" "rentdaddy_cluster" {
  name = "rentdaddy-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "rentdaddy-cluster"
  }
}

# Launch Template for ECS Main Application
resource "aws_launch_template" "main_app_launch_template" {
  name_prefix            = "rentdaddy-main-app-"
  image_id               = var.ami_id
  instance_type          = "t3.micro"
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.main_app_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp2"
      delete_on_termination = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.rentdaddy_cluster.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_SPOT_INSTANCE_DRAINING=true" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config
    
    # Update system
    yum update -y
    
    # Install CloudWatch agent
    yum install -y amazon-cloudwatch-agent
    
    # Set up automatic updates
    yum install -y yum-cron
    sed -i 's/apply_updates = no/apply_updates = yes/g' /etc/yum/yum-cron.conf
    systemctl enable yum-cron
    systemctl start yum-cron
    
    # Create backup directory
    mkdir -p /home/ec2-user/backups
    chown -R ec2-user:ec2-user /home/ec2-user/backups
    
    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-linux
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "rentdaddy-main-app"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Launch Template for ECS Documenso
resource "aws_launch_template" "documenso_launch_template" {
  name_prefix            = "rentdaddy-documenso-"
  image_id               = var.ami_id
  instance_type          = "t3.small"
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.documenso_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp2"
      delete_on_termination = true
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.rentdaddy_cluster.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_SPOT_INSTANCE_DRAINING=true" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config
    
    # Update system
    yum update -y
    
    # Install CloudWatch agent
    yum install -y amazon-cloudwatch-agent
    
    # Set up automatic updates
    yum install -y yum-cron
    sed -i 's/apply_updates = no/apply_updates = yes/g' /etc/yum/yum-cron.conf
    systemctl enable yum-cron
    systemctl start yum-cron
    
    # Create backup directory
    mkdir -p /home/ec2-user/backups
    chown -R ec2-user:ec2-user /home/ec2-user/backups
    
    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-linux
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "rentdaddy-documenso"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group for Main App
resource "aws_autoscaling_group" "main_app_asg" {
  name                = "rentdaddy-main-app-asg"
  vpc_zone_identifier = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_b.id]
  desired_capacity    = 1
  min_size            = 1
  max_size            = 2

  launch_template {
    id      = aws_launch_template.main_app_launch_template.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "rentdaddy-main-app"
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }
}

# Auto Scaling Group for Documenso
resource "aws_autoscaling_group" "documenso_asg" {
  name                = "rentdaddy-documenso-asg"
  vpc_zone_identifier = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_b.id]
  desired_capacity    = 1
  min_size            = 1
  max_size            = 1

  launch_template {
    id      = aws_launch_template.documenso_launch_template.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "rentdaddy-documenso"
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }
}

# ECS Capacity Providers
resource "aws_ecs_capacity_provider" "main_app_capacity_provider" {
  name = "rentdaddy-main-app-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.main_app_asg.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

resource "aws_ecs_capacity_provider" "documenso_capacity_provider" {
  name = "rentdaddy-documenso-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.documenso_asg.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

resource "aws_ecs_task_definition" "documenso" {
  family                   = "rentdaddy-documenso"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "1024"
  memory                   = "1800"

  container_definitions = jsonencode([
    {
      name      = "documenso"
      image     = "${var.documenso_image}"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "PORT", value = "3000" },
        { name = "NODE_ENV", value = "production" }
      ]
      secrets = [
        { name = "NEXTAUTH_SECRET", valueFrom = "${var.secrets_arn}:NEXTAUTH_SECRET::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_KEY", valueFrom = "${var.secrets_arn}:NEXT_PRIVATE_ENCRYPTION_KEY::" },
        { name = "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY", valueFrom = "${var.secrets_arn}:NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY::" },
        { name = "POSTGRES_USER", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "${var.secrets_arn}:DOCUMENSO_POSTGRES_DB::" },
        { name = "DATABASE_URL", valueFrom = "${var.secrets_arn}:DOCUMENSO_DATABASE_URL::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.documenso_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "documenso"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      name      = "postgres"
      image     = "postgres:14-alpine"
      essential = true
      portMappings = [
        {
          containerPort = 5432
          hostPort      = 5433
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "POSTGRES_USER", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_USER}" },
        { name = "POSTGRES_PASSWORD", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_PASSWORD}" },
        { name = "POSTGRES_DB", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_DB}" }
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
      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U #{AWS_SECRETS:DOCUMENSO_POSTGRES_USER} -p 5432"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  volume {
    name      = "documenso-postgres-data"
    host_path = "/home/ec2-user/documenso/postgres-data"
  }

  tags = {
    Name = "rentdaddy-documenso"
  }
}

# The following ECS services definitions need to be added
# since they're missing from the pasted code:

resource "aws_ecs_service" "main_app_service" {
  name            = "rentdaddy-main-app-service"
  cluster         = aws_ecs_cluster.rentdaddy_cluster.id
  task_definition = aws_ecs_task_definition.main_app.arn
  desired_count   = 1
  launch_type     = "EC2"

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main_app_capacity_provider.name
    weight            = 100
    base              = 1
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "rentdaddy-main-app-service"
  }
}

resource "aws_ecs_service" "documenso_service" {
  name            = "rentdaddy-documenso-service"
  cluster         = aws_ecs_cluster.rentdaddy_cluster.id
  task_definition = aws_ecs_task_definition.documenso.arn
  desired_count   = 1
  launch_type     = "EC2"

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.documenso_capacity_provider.name
    weight            = 100
    base              = 1
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "rentdaddy-documenso-service"
  }
}
