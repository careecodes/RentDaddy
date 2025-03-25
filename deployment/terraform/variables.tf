# variables.tf
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "AMI ID for ECS instances (Amazon ECS-optimized Amazon Linux 2 AMI)"
  type        = string
  default     = "ami-0fe5f366c083f59ca" # Amazon ECS-optimized Amazon Linux 2 AMI for us-east-1
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
}

variable "ecr_repository_url" {
  description = "URL of the ECR repository for application images"
  type        = string
}

variable "documenso_image" {
  description = "Docker image for Documenso service"
  type        = string
  default     = "documenso/documenso:latest"
}

variable "secrets_arn" {
  description = "ARN of the AWS Secrets Manager secret containing application secrets"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for application files and backups"
  type        = string
  default     = "rentdaddydocumenso"
}
