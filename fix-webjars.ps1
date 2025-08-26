# Clean existing WebJars directory structure
Remove-Item -Path "e:\code\WebChat\target\classes\META-INF\resources\webjars\*" -Recurse -Force

# Create WebJars root directory
New-Item -ItemType Directory -Path "e:\code\WebChat\target\classes\META-INF\resources\webjars" -Force

# Define WebJars files to process
$webjars = @(
    @{name='sockjs-client'; version='1.5.1'; jarFile='sockjs-client-1.5.1.jar'},
    @{name='stomp-websocket'; version='2.3.3'; jarFile='stomp-websocket-2.3.3.jar'},
    @{name='bootstrap'; version='5.1.3'; jarFile='bootstrap-5.1.3.jar'},
    @{name='jquery'; version='3.6.0'; jarFile='jquery-3.6.0.jar'}
)

# Process each WebJar
foreach ($webjar in $webjars) {
    $name = $webjar.name
    $version = $webjar.version
    $jarFile = $webjar.jarFile
    $jarPath = "e:\code\WebChat\lib\$jarFile"
    $targetDir = "e:\code\WebChat\target\classes\META-INF\resources\webjars\$name\$version"
    $tempDir = "e:\code\WebChat\temp\$name"
    $zipPath = "$tempDir\$name.zip"

    # Create temporary directory
    New-Item -ItemType Directory -Path $tempDir -Force

    # Copy JAR to ZIP
    Write-Host "Preparing $jarFile..."
    Copy-Item -Path $jarPath -Destination $zipPath

    # Extract using Expand-Archive
    Write-Host "Extracting $jarFile..."
    Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

    # Create target directory
    New-Item -ItemType Directory -Path $targetDir -Force

    # Move extracted resources to target directory
    Write-Host "Moving $name $version resources..."
    # Check if the standard WebJar structure exists
    if (Test-Path "$tempDir\META-INF\resources\webjars\$name\$version") {
        Move-Item -Path "$tempDir\META-INF\resources\webjars\$name\$version\*" -Destination $targetDir -Force
    } else {
        # If the WebJar has a different structure, move all files except META-INF
        Move-Item -Path "$tempDir\*" -Destination $targetDir -Force -Exclude "META-INF", "$name.zip"
    }

    # Clean up temporary directory
    Remove-Item -Path $tempDir -Recurse -Force
}

Write-Host "WebJars resources processing completed!"