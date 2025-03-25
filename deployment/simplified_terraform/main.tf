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
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = "us-east-2${count.index == 0 ? "a" : "b"}"
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
  instance_type = "t3.small"              # For Documenso as mentioned in your requirements
  key_name      = "rentdaddy_key"         # Make sure this key pair exists

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
resource "aws_ecs_task_definition" "backend" {
  family                   = "rentdaddy-backend"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "512"
  memory                   = "900"

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/backend:latest"
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
        { name = "ENV", value = "production" }
      ]
      secrets = [
        { name = "POSTGRES_USER", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_DB::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend_logs.name
          "awslogs-region"        = "us-east-2"
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
    }
  ])

  volume {
    name      = "app-temp"
    host_path = "/home/ec2-user/app/temp"
  }
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "rentdaddy-frontend"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/frontend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5173
          hostPort      = 5173
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "VITE_PORT", value = "5173" }
      ]
      secrets = [
        { name = "VITE_CLERK_PUBLISHABLE_KEY", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:VITE_CLERK_PUBLISHABLE_KEY::" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend_logs.name
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
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
      image     = "168356498770.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/documenso:latest"
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
        { name = "NEXTAUTH_SECRET", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:NEXTAUTH_SECRET::" },
        { name = "DATABASE_URL", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:DATABASE_URL::" }
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
resource "aws_ecs_task_definition" "postgres" {
  family                   = "rentdaddy-postgres"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "main-postgres"
      image     = "postgres:14-alpine"
      essential = true
      portMappings = [
        {
          containerPort = 5432
          hostPort      = 5432
          protocol      = "tcp"
        }
      ]
      #   environment = [
      #     { name = "POSTGRES_USER", value = "#{AWS_SECRETS:POSTGRES_USER}" },
      #     { name = "POSTGRES_PASSWORD", value = "#{AWS_SECRETS:POSTGRES_PASSWORD}" },
      #     { name = "POSTGRES_DB", value = "#{AWS_SECRETS:POSTGRES_DB}" }
      #   ]
      secrets = [
        { name = "POSTGRES_USER", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA:POSTGRES_DB::" }
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
    {
      name      = "documenso-postgres"
      image     = "postgres:14-alpine"
      essential = true
      portMappings = [
        {
          containerPort = 5432
          hostPort      = 5433
          protocol      = "tcp"
        }
      ]
      #   environment = [
      #     { name = "POSTGRES_USER", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_USER}" },
      #     { name = "POSTGRES_PASSWORD", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_PASSWORD}" },
      #     { name = "POSTGRES_DB", value = "#{AWS_SECRETS:DOCUMENSO_POSTGRES_DB}" }
      #   ]
      secrets = [
        { name = "POSTGRES_USER", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:DOCUMENSO_POSTGRES_USER::" },
        { name = "POSTGRES_PASSWORD", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:DOCUMENSO_POSTGRES_PASSWORD::" },
        { name = "POSTGRES_DB", valueFrom = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/documenso-FYv9hn:DOCUMENSO_POSTGRES_DB::" }
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
    name      = "postgres-data"
    host_path = "/home/ec2-user/app/postgres-data"
  }

  volume {
    name      = "documenso-postgres-data"
    host_path = "/home/ec2-user/documenso/postgres-data"
  }
}

# ECS Services
resource "aws_ecs_service" "backend" {
  name            = "rentdaddy-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "rentdaddy-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
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

  ordered_placement_strategy {
    type  = "binpack"
    field = "memory"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "postgres" {
  name            = "rentdaddy-postgres-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.postgres.arn
  desired_count   = 1

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
  name     = "frontend-tg"
  port     = 5173
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

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
  name     = "backend-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/" # Adjust if your backend has a different health check path
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "documenso" {
  name     = "documenso-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

resource "aws_lb_target_group_attachment" "frontend" {
  count            = length(data.aws_instances.ecs_instances.ids)
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = data.aws_instances.ecs_instances.ids[count.index]
  port             = 5173
}

resource "aws_lb_target_group_attachment" "backend" {
  count            = length(data.aws_instances.ecs_instances.ids)
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = data.aws_instances.ecs_instances.ids[count.index]
  port             = 8080
}

resource "aws_lb_target_group_attachment" "documenso" {
  count            = length(data.aws_instances.ecs_instances.ids)
  target_group_arn = aws_lb_target_group.documenso.arn
  target_id        = data.aws_instances.ecs_instances.ids[count.index]
  port             = 3000
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}


resource "aws_route53_record" "validate_app_cert" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_26feeea980e5b9a570740aea36c08250.app.curiousdev.net."
  type    = "CNAME"
  ttl     = 300
  records = ["_e3388d6accc1c6e5f41d5c8851d98a40.xlfgrmvvlj.acm-validations.aws."]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route53_record" "acm_validation_docs" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_3202e4d9e072fd2a55853a587e6c3cde.docs.curiousdev.net"
  type    = "CNAME"
  ttl     = 300
  records = ["_34117048b6acc0aa84239bc4fc1dd1a1.xlfgrmvvlj.acm-validations.aws."]

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

  # Comment out the alias block for now
  # alias {
  #   name                   = aws_lb.main.dns_name
  #   zone_id                = aws_lb.main.zone_id
  #   evaluate_target_health = true
  # }
  lifecycle {
    prevent_destroy = true
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

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
