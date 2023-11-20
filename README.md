# Welcome to the Factorio Elastic Container Service Fargate Server project

## Setup
### Initial steps
* Use the .env.example as a template to set up the .env with your account number, application name, and region.
* Make sure you have bootstrapped your account for CDK
* Create a local AWS profile named "factorio-ecs-fargate-server-cdk-user" with the appropriate permissions to deploy CDK stacks.
### Deployment
Use the commands below to deploy out the stacks. Start with the infrastructure stack, then deploy the server stack.

## Stack deployment commands

* `cdk deploy factorio-ecs-fargate-server-shared-FactorioEcsFargateServerInfrastructureStack --profile factorio-ecs-fargate-server-cdk-user`
* `cdk deploy factorio-ecs-fargate-server-development-FactorioEcsFargateServerStack --profile factorio-ecs-fargate-server-cdk-user`

## Maintaining the EFS Data
The EFS attached to the server stack is where the Factorio docker container will save data. To access this there are at least 2 options. First is to use the execute command from the
AWS CLI, second is to spin up an EC2 and mount the EFS. First option you will need vim to edit things, and file uploads/downloads are a pain. Second option allows for tools such as Mobaxterm to use SSH and SFTP for easy file editing and upload/download.

### EC2 for Maintaining EFS
* Create a new instance, use the VPC created by the CDK. Use the EC2 security group. t3a.medium is a decent option to use. Use the latest Amazon Linux AMI (AL2023 for now).
  Create a new key pair or use an existing one, but you will need to save it locally either way. Launch the instance.
* Open up the security group attached to the instance, and add port 22 tcp for your ip address <your ip>/32 for ingress so that you are the only one who can access it (it will be public, so this is important). You can get your ip address from google: https://www.google.com/search?q=what%27s+my+ip
* connect using mobaxterm by creating a new session from the public ip address of the EC2 and the username "ec2-user", adding your key pair as the authentication method.
* go to the EFS console and get the id of the factorio EFS.
* Run the install command for the EFS utilities "sudo yum install -y amazon-efs-utils"
* Run the commands below:
 * sudo yum install -y amazon-efs-utils
 * mkdir factorio-efs-mount-point
 * sudo mount -t efs <efs id> factorio-efs-mount-point/
 * sudo chmod -R 777 factorio-efs-mount-point

Now you should be able to edit files, upload files, download files, and configure things as you want.
#### IMPORTANT
Once you are done, "stop" the instance so it won't continue to bill.
When you start the instance again, you will need to run the mount command once again:
* sudo mount -t efs <efs id> factorio-efs-mount-point/
