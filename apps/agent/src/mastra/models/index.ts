import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const bedrock = createAmazonBedrock({
    region: process.env.AWS_REGION,
    credentialProvider: fromNodeProviderChain()
})

export { bedrock }