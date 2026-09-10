# TalentSphere CDN Configuration
# AWS CloudFront for static asset delivery

## Overview
CloudFront distributes static assets from S3 with global edge caching.

## Architecture
```
User -> CloudFront (Edge) -> S3 Bucket
                    -> Regional Edge Cache
```

## Configuration

### S3 Bucket
- `talentsphere-static-assets` (production)
- `talentsphere-static-assets-staging` (staging)

### CloudFront Distributions

| Environment | Domain | Price Class |
|------------|-------|----------|
| Production | d1234567890.cloudfront.net | All Locations |
| Staging | d9876543210.cloudfront.net | US/Europe |

## Origins

### Static Assets
- Origin: `talentsphere-static-assets.s3.amazonaws.com`
- Protocol: HTTPS only
- SSL: CloudFront default

### Frontend SPA
- Origin: ALB (Application Load Balancer)
- Protocol: HTTPS
- Cache: Disabled (dynamic content)

## Behaviors

| Path Pattern | Origin | Cache Policy | TTL |
|------------|-------|-----------|-----|
| `/assets/*` | S3 | StaticAssets | 1 year |
| `/*.js` | S3 | StaticAssets | 1 year |
| `/*.css` | S3 | StaticAssets | 1 year |
| `/*.ico` | S3 | StaticAssets | 1 year |
| `/images/*` | S3 | Images | 7 days |
| `/*` | ALB | None | 0 |

## Cache Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id ABC123DEF456GHI \
  --paths "/*"
```

## Environment Variables
```bash
# Frontend uses CDN for static assets
VITE_CDN_URL=https://d1234567890.cloudfront.net
VITE_ASSETS_URL=https://d1234567890.cloudfront.net/assets
```

## Terraform Example
```hcl
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = "talentsphere-frontend.s3.amazonaws.com"
    origin_id = "S3-frontend"
  }

  enabled = true
  price_class = "PriceClass_All"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods       = ["GET", "HEAD"]
    target_origin_id     = "S3-frontend"
    viewer_protocol_policy = "redirect-to-https"

    compress = true
    cache_policy_id = "658327ea-f89d-4f36-bc2e-1ab3de6b4e28"  # Managed-CachingOptimized
  }

  cache_behavior {
    path_pattern = "/assets/*"
    allowed_methods = ["GET", "HEAD"]
    cached_methods = ["GET", "HEAD"]
    target_origin_id = "S3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress = true
    cache_policy_id = "658327ea-f89d-4f36-bc2e-1ab3de6b4e28"
  }
}
```

## Monitoring
- CloudWatch metrics: Requests, Bytes-downloaded, Error rate
- Real-time logs to Kinesis Firehose -> S3