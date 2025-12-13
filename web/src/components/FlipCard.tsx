import { useEffect, useRef, useState, useCallback } from 'react'

interface FlipCardProps {
  questionHtml: string
  answerHtml: string
  css?: string
  theme?: string
  isFlipped: boolean
  className?: string
  minHeight?: number
}

/**
 * 带翻转动画的卡片组件
 * 正反面大小统一，翻转效果流畅
 */
export function FlipCard({
  questionHtml,
  answerHtml,
  css = '',
  theme = 'cupcake',
  isFlipped,
  className = '',
  minHeight = 200,
}: FlipCardProps) {
  const questionRef = useRef<HTMLIFrameElement>(null)
  const answerRef = useRef<HTMLIFrameElement>(null)
  const [questionHeight, setQuestionHeight] = useState(minHeight)
  const [answerHeight, setAnswerHeight] = useState(minHeight)

  // 统一高度：取正反面的最大高度
  const cardHeight = Math.max(questionHeight, answerHeight, minHeight)

  const buildHtml = useCallback((html: string, side: 'question' | 'answer') => `
    <!DOCTYPE html>
    <html data-theme="${theme}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.5.13/daisyui.css" rel="stylesheet" type="text/css" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
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
            overflow: hidden;
          }
          body {
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .shiyi-card-wrapper {
            width: 100%;
            padding: 1.5rem;
          }
          ${css}
        </style>
      </head>
      <body>
        <div class="shiyi-card-wrapper">
          ${html}
        </div>
        <script>
          function updateHeight() {
            const height = document.body.scrollHeight;
            window.parent.postMessage({ type: 'flipcard-resize', height: height, side: '${side}' }, '*');
          }
          (function() {
            if (window._shiyiObserver) window._shiyiObserver.disconnect();
            window._shiyiObserver = new ResizeObserver(updateHeight);
            window._shiyiObserver.observe(document.body);
          })();
          setTimeout(updateHeight, 100);
          setTimeout(updateHeight, 500);
          document.querySelectorAll('img').forEach(img => img.onload = updateHeight);
        </script>
      </body>
    </html>
  `, [theme, css])

  // 渲染问题面
  useEffect(() => {
    const iframe = questionRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildHtml(questionHtml, 'question'))
    doc.close()
  }, [questionHtml, buildHtml])

  // 渲染答案面
  useEffect(() => {
    const iframe = answerRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildHtml(answerHtml, 'answer'))
    doc.close()
  }, [answerHtml, buildHtml])

  // 监听高度变化
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'flipcard-resize') {
        const newHeight = event.data.height + 20
        if (event.data.side === 'question') {
          setQuestionHeight(newHeight)
        } else if (event.data.side === 'answer') {
          setAnswerHeight(newHeight)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div 
      className={`perspective-1000 ${className}`}
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          height: `${cardHeight}px`,
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        {/* 问题面（正面） */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden shadow-sm border"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <iframe
            ref={questionRef}
            className="w-full h-full border-0"
            title="Question"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* 答案面（背面） */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden shadow-sm border"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
          }}
        >
          <iframe
            ref={answerRef}
            className="w-full h-full border-0"
            title="Answer"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
