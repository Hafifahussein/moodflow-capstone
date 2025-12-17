const fs = require('fs')
const path = require('path')

console.log('Creating Vercel Build Output API structure...')

// Create .vercel/output directory structure
const outputDir = '.vercel/output'
const staticDir = path.join(outputDir, 'static')

// Remove old output if exists
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true })
}

// Create directories
fs.mkdirSync(staticDir, { recursive: true })
fs.mkdirSync(path.join(outputDir, 'config'), { recursive: true })

// Copy dist contents to static
console.log('Copying dist to static...')
copyRecursive('dist', staticDir)

// Find the AppEntry JS file and copy to root with simple name
console.log('Finding and copying JS bundle to root...')
const jsDir = path.join('dist', '_expo', 'static', 'js', 'web')
if (fs.existsSync(jsDir)) {
  const files = fs.readdirSync(jsDir)
  const jsFile = files.find((f) => f.startsWith('AppEntry') && f.endsWith('.js'))
  if (jsFile) {
    console.log(`Found JS file: ${jsFile}`)
    fs.copyFileSync(path.join(jsDir, jsFile), path.join(staticDir, 'bundle.js'))
    console.log('Copied to bundle.js at root')
  }
}

// Update index.html to use simple path
console.log('Updating index.html paths...')
const indexPath = path.join(staticDir, 'index.html')
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8')
  html = html.replace(/src="[^"]*AppEntry[^"]*\.js"/, 'src="/bundle.js"')
  fs.writeFileSync(indexPath, html)
  console.log('Updated index.html to use /bundle.js')
}

// Create config.json with proper routing
const config = {
  version: 3,
  routes: [
    {
      src: '^/static/(.*)$',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '^/assets/(.*)$',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      handle: 'filesystem',
    },
    {
      src: '/(.*)',
      dest: '/index.html',
    },
  ],
}

fs.writeFileSync(path.join(outputDir, 'config.json'), JSON.stringify(config, null, 2))

console.log('Vercel Build Output API structure created successfully!')

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return

  const stats = fs.statSync(src)

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach((item) => {
      copyRecursive(path.join(src, item), path.join(dest, item))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}
