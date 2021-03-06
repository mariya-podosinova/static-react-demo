import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deployment from "@aws-cdk/aws-s3-deployment";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import { ViewerProtocolPolicy } from "@aws-cdk/aws-cloudfront";

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Hosting Bucket
    const bucket = new s3.Bucket(this, "mariya-static-react-app-hosting", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Deployment bucket
    new s3Deployment.BucketDeployment(
      this,
      "mariya-static-react-app-deployment",
      {
        destinationBucket: bucket,
        sources: [s3Deployment.Source.asset("../build")],
      }
    );

    const distribution = new cloudfront.Distribution(
      this,
      "mariya-static-react-app-distribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        webAclId: `arn:aws:wafv2:us-east-1:${process.env.AWS_ACCOUNT}:global/webacl/${process.env.WEB_ACL_ID}`,
      }
    );
    // 3. Add permission boundary
    const boundary = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      "Boundary",
      `arn:aws:iam::${process.env.AWS_ACCOUNT}:policy/ScopePermissions`
    );
    iam.PermissionsBoundary.of(this).apply(boundary);

    // 4. Outputs
    new cdk.CfnOutput(this, "Bucket URL", {
      value: bucket.bucketDomainName,
    });
    new cdk.CfnOutput(this, "CloudFront URL", {
      value: distribution.distributionDomainName,
    });
  }
}
