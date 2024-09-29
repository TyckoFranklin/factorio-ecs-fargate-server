const { ECSClient, ListClustersCommand, ListServicesCommand, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand,  } = require("@aws-sdk/client-ecs");
const { EC2Client, DescribeNetworkInterfacesCommand } = require("@aws-sdk/client-ec2");

const { region, deploymentType } = process.env;
exports.handler = async () => {
    const ecsClient = new ECSClient({});
    const ec22Client = new EC2Client({});

    // List clusters
    const clustersResponse = await ecsClient.send(new ListClustersCommand({ }));
    console.log(JSON.stringify({ clustersResponse }, null, 4));
    const firstClusterArn = (clustersResponse?.clusterArns ?? [])[0];

    // List services
    const listServicesResponse = await ecsClient.send(new ListServicesCommand({ cluster: firstClusterArn,  }));
    console.log(JSON.stringify({ listServicesResponse: listServicesResponse }, null, 4));

    // List tasks
    const tasksResponse = await ecsClient.send(new ListTasksCommand({ cluster: firstClusterArn,  }));
    console.log(JSON.stringify({ tastsResponse: tasksResponse }, null, 4));

    // Describe tasks
    const tasksDescribeResponse = await ecsClient.send(new DescribeTasksCommand({ cluster: firstClusterArn, tasks:tasksResponse.taskArns }));
    console.log(JSON.stringify({ tasksDescribeResponse: tasksDescribeResponse }, null, 4));

    // Describe services
    const servicesDescribeResponse = await ecsClient.send(new DescribeServicesCommand({ cluster: firstClusterArn,services:listServicesResponse.serviceArns }));
    console.log(JSON.stringify({ servicesDescribeResponse: servicesDescribeResponse }, null, 4));

    const networkInterfaceIDs = [];
    const foundTags = [];
    for(const task of tasksDescribeResponse.tasks ?? []){
        // for (const tag of task.tags ?? []){
        //     foundTags.push(tag);
        //     if(tag.key === "name" && tag.value === `${deploymentType}-factorio-server`){
                for (const { details } of task.attachments ?? []){
                    const networkInterfaceID = details?.find(value=> {
                        return value.name === "networkInterfaceId";
                    })
                    networkInterfaceIDs.push(networkInterfaceID);
                }

        //     }
        // }
    }

    const describeNetworkInterfacesCommandResponse = [];
    const ipAddresses = [];
    for(const networkInterfaceIDValue of networkInterfaceIDs){
        const command = new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: [`${networkInterfaceIDValue?.value}`],
        });

        const response = await ec22Client.send(command);
        describeNetworkInterfacesCommandResponse.push(response);
        for(const networkInterface of response.NetworkInterfaces ?? []){
            ipAddresses.push(networkInterface.Association?.PublicIp);
        }
    }

    console.log(JSON.stringify({
        servicesDescribeResponse,
        tasksDescribeResponse,
        listServicesResponse,
        clustersResponse,
        tasksResponse,
        networkInterfaceIDs,
        foundTags,
        describeNetworkInterfacesCommandResponse,
        ipAddresses,
    }, null, 4));


    return ipAddresses;
};
