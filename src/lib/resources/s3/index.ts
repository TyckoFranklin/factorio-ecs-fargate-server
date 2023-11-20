import { Bucket } from "aws-cdk-lib/aws-s3"

const s3BucketLookup:Map<string, Bucket> = new Map()
export const addS3Bucket = (key:string, bucket:Bucket) => {
    if(s3BucketLookup.has(key)){
        const stackTrace = Error().stack;
        console.error(stackTrace);
        throw Error(`S3 Bucket has already been defined for key: ${key}`);
    }
    s3BucketLookup.set(key, bucket);
}

export const getS3Bucket = (key:string) => {
    const bucket = s3BucketLookup.get(key);
    if(!bucket){
        const stackTrace = Error().stack;
        console.error(stackTrace);
        throw Error(`S3 Bucket has not been defined yet for key: ${key}`);
    }
    return bucket;
}