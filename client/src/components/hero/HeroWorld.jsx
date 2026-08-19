import React from 'react'
import { motion as Motion } from 'framer-motion'

/**
 * Cinematic road environment — already in the scene, revealed by the camera pull.
 * Continuous motion is a slow travel dolly, not a looped clip.
 */
export default function HeroWorld({ camera, reduceMotion }) {
  const { atmosphereY, hazeX, lightX, lightY, worldScale, worldX, worldY } = camera

  return (
    <div className="hero-world" aria-hidden="true">
      <Motion.div
        className="hero-world-rig"
        style={
          reduceMotion
            ? undefined
            : {
                scale: worldScale,
                x: worldX,
                y: worldY,
              }
        }
      >
        <div className={`hero-world-drift${reduceMotion ? ' is-still' : ''}`}>
          <img
            src="/images/hero-road.webp"
            alt=""
            width={1536}
            height={1024}
            decoding="async"
            draggable={false}
            className="hero-world-plate"
          />
        </div>
        <div className={`hero-road-depth${reduceMotion ? '' : ' is-live'}`} />
      </Motion.div>

      <Motion.div
        className="hero-world-veil"
        style={reduceMotion ? undefined : { y: atmosphereY, x: hazeX }}
      >
        <div className="hero-world-grade" />
        <div className={`hero-world-mist${reduceMotion ? '' : ' is-live'}`} />
        {!reduceMotion ? (
          <Motion.div
            className="hero-keylight"
            style={{ left: lightX, top: lightY, x: '-50%', y: '-50%' }}
          />
        ) : null}
      </Motion.div>
    </div>
  )
}
