import { useEffect, useRef } from 'react'

function RevealImage({ as: Tag = 'img', className = '', ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return

    element.classList.add('image-reveal-pending')
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        element.classList.remove('image-reveal-pending')
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    observer.observe(element)

    return () => {
      observer.disconnect()
      element.classList.remove('image-reveal-pending')
    }
  }, [])

  return <Tag ref={ref} className={`image-reveal ${className}`} {...props} />
}

export default RevealImage
