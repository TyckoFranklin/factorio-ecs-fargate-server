# Welcome to the Factorio Elastic Container Service Fargate Server project

# First up: Disclaimer/License

By using or referencing the code provided here, you agree to the following terms:

1. No Warranty: The code is provided "as is" without any warranty, express or implied. The author(s) make no representations or warranties regarding the accuracy or completeness of the code.
2. Use at Your Own Risk: You acknowledge that the use of this code is at your own risk. The author(s) shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses.
3. Code Modifications: You are free to modify the code for your own purposes. However, any modifications made are your responsibility, and the original author(s) are not obligated to provide support or assistance for modified code.
4. No Support: The author(s) are not obligated to provide support, maintenance, updates, or enhancements to the code. However, contributions and feedback are welcome.
5. Compliance with Laws: You agree to use the code in compliance with all applicable laws, regulations, and third-party rights.

By using or referencing this code, you acknowledge that you have read, understood, and agreed to these terms. If you do not agree with these terms, do not use or reference the code.

Please see license file for continuation of the above text. If there are any conflicts between the license file and the above text, the license file will take precedence.


## Setup

### Initial steps
* Use the .env.example as a template to set up the .env with your account number, application name, and region.
* Install (AWS CLI)[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html]
* Make sure you have bootstrapped your account for CDK. (CDK Bootstrapping)[https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html]
* Create a local AWS profile named "factorio-ecs-fargate-server-cdk-user" with the appropriate permissions to deploy CDK stacks.
 * Create IAM user with administrator access, then create security credentials and save the Access Key and Secret Key
 * run: aws configure --profile factorio-ecs-fargate-server-cdk-user
 * follow prompts.
### Deployment
Use the commands below to deploy out the stacks. Start with the infrastructure stack, then deploy the server stack.

## Stack deployment commands

* `cdk deploy factorio-ecs-fargate-server-shared-FactorioEcsFargateServerInfrastructureStack --profile factorio-ecs-fargate-server-cdk-user`
* `cdk deploy factorio-ecs-fargate-server-development-FactorioEcsFargateServerStack --profile factorio-ecs-fargate-server-cdk-user`

## Maintaining the ECS service

Once deployed, there will be many resources created and the server will be switched on.
In ECS, the main resources created that need to be known about for day to day are: Cluster, Service, and Task.
After deployment the ECS cluster should have a service that starts a task and the server will be ready to be connected to.
To stop the server and not be charged for compute time (the bulk of billing for this stack), you can go into the AWS Web Console, to the ECS
page, then choose the new cluster, select the service, then click the "update service" button and set the desired tasks to 0 to turn stop running the server. To start the server you take the same steps, but you then select 1 for desired task count. Turning the Factorio server on and off is that simple.

Note: On initial deployment, the task in the service might fail the first time as resources are being built, but the ECS cluster service will restart the task in this case and it should work after a few minutes.

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

# Special Thanks and Reference:

## factorio-spot-pricing
This CDK was largely inspired by the [factorio-spot-pricing](https://github.com/m-chandler/factorio-spot-pricing) cloud formation template.
(m-chandler)[https://github.com/m-chandler] created and maintains this GitHub Repo

## (Below Copied from factorio-spot-pricing)
Thanks goes out to [FactorioTools](https://github.com/factoriotools) ([and contributors](https://github.com/factoriotools/factorio-docker/graphs/contributors)) for maintaining the Factorio Docker images.

