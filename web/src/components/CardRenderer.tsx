import { useEffect, useRef, useState } from 'react'

interface CardRendererProps {
  html: string
  css?: string
  theme?: string // daisyUI 主题名称
  className?: string
  minHeight?: number
}

// daisyUI 主题列表
export const DAISY_THEMES = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
] as const

export type DaisyTheme = typeof DAISY_THEMES[number]

/**
 * 使用 iframe 隔离样式的卡片渲染组件
 * 内置 daisyUI 主题支持
 */
export function CardRenderer({ 
  html, 
  css = '', 
  theme = 'cupcake',
  className = '', 
  minHeight = 200 
}: CardRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(minHeight)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    // 构建完整的 HTML 文档，引入 daisyUI
    const fullHtml = `
      <!DOCTYPE html>
      <html data-theme="${theme}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- 引入 Tailwind CSS + daisyUI -->
          <link href="https://cdn.jsdelivr.net/npm/daisyui@5.5.13/daisyui.css" rel="stylesheet" type="text/css" />
          <script src="https://cdn.tailwindcss.com"></script>
          <!-- Google Fonts -->
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            /* 基础样式 */
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            html, body {
              width: 100%;
              min-height: 100%;
              font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              overflow: hidden;
            }
            
            body {
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            /* 卡片内容容器 */
            .shiyi-card-wrapper {
              width: 100%;
              padding: 1rem;
            }

            /* 用户自定义 CSS */
            ${css}
          </style>
        </head>
        <body>
          <div class="shiyi-card-wrapper">
            ${html}
          </div>
          <script>
            // 自动调整高度
            function updateHeight() {
              const height = document.body.scrollHeight;
              window.parent.postMessage({ type: 'resize', height: height }, '*');
            }
            
            // 监听内容变化 - 使用 IIFE 避免重复声明
            (function() {
              if (window._shiyiObserver) {
                window._shiyiObserver.disconnect();
              }
              window._shiyiObserver = new ResizeObserver(updateHeight);
              window._shiyiObserver.observe(document.body);
            })();
            
            // 初始高度
            setTimeout(updateHeight, 100);
            
            // 图片加载后更新高度
            document.querySelectorAll('img').forEach(function(img) {
              img.onload = updateHeight;
            });
          </script>
        </body>
      </html>
    `

    doc.open()
    doc.write(fullHtml)
    doc.close()
  }, [html, css, theme])

  // 监听 iframe 内部的高度变化
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize') {
        const newHeight = Math.max(minHeight, event.data.height + 10)
        setHeight(newHeight)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [minHeight])

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border-0 rounded-lg ${className}`}
      style={{ height: `${height}px` }}
      title="Card Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
