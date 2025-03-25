# outputs.tf
output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.rentdaddy_cluster.name
}

output "main_app_task_definition" {
  description = "The ARN of the main application task definition"
  value       = aws_ecs_task_definition.main_app.arn
}

output "documenso_task_definition" {
  description = "The ARN of the Documenso task definition"
  value       = aws_ecs_task_definition.documenso.arn
}

output "main_app_instance_command" {
  description = "Command to SSH into a main application instance"
  value       = "Use AWS Systems Manager Session Manager to connect to the instances securely"
}

output "documenso_instance_command" {
  description = "Command to SSH into a Documenso instance"
  value       = "Use AWS Systems Manager Session Manager to connect to the instances securely"
}

output "cloudwatch_log_groups" {
  description = "The CloudWatch Log Groups for the ECS services"
  value = {
    main_app  = aws_cloudwatch_log_group.main_app_logs.name
    documenso = aws_cloudwatch_log_group.documenso_logs.name
  }
}

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.rentdaddy_vpc.id
}

output "public_subnets" {
  description = "The IDs of the public subnets"
  value       = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_b.id]
}

output "main_app_asg_name" {
  description = "The name of the main application Auto Scaling Group"
  value       = aws_autoscaling_group.main_app_asg.name
}

output "documenso_asg_name" {
  description = "The name of the Documenso Auto Scaling Group"
  value       = aws_autoscaling_group.documenso_asg.name
}

output "main_app_service_name" {
  description = "The name of the main application ECS service"
  value       = aws_ecs_service.main_app_service.name
}

output "documenso_service_name" {
  description = "The name of the Documenso ECS service"
  value       = aws_ecs_service.documenso_service.name
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.rentdaddy_bucket.id
}


