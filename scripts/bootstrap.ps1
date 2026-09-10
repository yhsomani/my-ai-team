# TalentSphere Workspace Bootstrap Script
$services = @('api-gateway', 'auth-service', 'user-service', 'profile-service', 'job-service', 'application-service', 'company-service', 'notification-service', 'search-service', 'analytics-service', 'gamification-service', 'challenge-service', 'lms-service', 'video-service', 'file-service', 'email-service', 'messaging-service', 'networking-service', 'payment-service')
foreach ($s in $services) {
    $pkg = $s -replace '-service', ''
    $path = "services/$s/src/main/java/com/talentsphere/$pkg"
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path
        Write-Host "Created service directory: services/$s"
    }
}

$frontendDirs = @('src/api', 'src/store', 'src/hooks', 'src/types', 'src/layouts/components', 'src/pages/auth', 'src/pages/dashboard', 'src/pages/jobs', 'src/pages/challenges', 'src/pages/lms', 'src/pages/profile', 'src/pages/gamification', 'src/pages/networking', 'src/pages/messaging', 'src/pages/settings', 'src/pages/billing', 'src/pages/ai', 'src/components/atoms', 'src/components/molecules', 'src/components/organisms')
foreach ($f in $frontendDirs) {
    $path = "apps/frontend/$f"
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path
        Write-Host "Created frontend directory: $path"
    }
}

$infraDirs = @('infra/docker', 'infra/k8s', 'infra/terraform', 'docs', 'scripts', '.github/workflows')
foreach ($i in $infraDirs) {
    if (!(Test-Path $i)) {
        New-Item -ItemType Directory -Force -Path $i
        Write-Host "Created utility directory: $i"
    }
}
