import { Vpc } from "aws-cdk-lib/aws-ec2"

const vpcLookup:Map<string, Vpc> = new Map()
export const addVPC = (key:string, vpc:Vpc) => {
    if(vpcLookup.has(key)){
        const stackTrace = Error().stack;
        console.error(stackTrace);
        throw Error(`VPC has already been defined for key: ${key}`);
    }
    vpcLookup.set(key, vpc);
}

export const getVPC = (key:string) => {
    const vpc = vpcLookup.get(key);
    if(!vpc){
        const stackTrace = Error().stack;
        console.error(stackTrace);
        throw Error(`VPC has not been defined yet for key: ${key}`);
    }
    return vpc;
}