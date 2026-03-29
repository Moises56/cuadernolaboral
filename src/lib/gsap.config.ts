import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

// Register plugins once — only in the browser
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export { gsap, ScrollTrigger, useGSAP }

// Animation tokens — use these constants for consistency across all components
export const ANIM = {
  duration: {
    micro:  0.2,
    fast:   0.3,
    normal: 0.6,
    slow:   0.8,
  },
  ease: {
    enter:  'power2.out',
    exit:   'power2.in',
    smooth: 'power3.out',
    spring: 'elastic.out(1, 0.5)',
  },
  stagger: {
    list:  0.06,
    cards: 0.1,
    chars: 0.03,
  },
} as const
