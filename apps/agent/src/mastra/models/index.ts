import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const bedrock = createAmazonBedrock({
    region: process.env.AWS_REGION,
    credentialProvider: fromNodeProviderChain()
})

const gemini = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export { bedrock, gemini }