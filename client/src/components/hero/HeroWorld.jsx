import React from 'react'
import { motion as Motion } from 'framer-motion'

const Plate = ({ className, position }) => (
  <div className={className}>
    <img
      src="/images/hero-road.webp"
      alt=""
      width={1536}
      height={1024}
      decoding="async"
      draggable={false}
      className="hero-plate-photo"
      style={{ objectPosition: position }}
    />
    <span className="hero-plate-grade" />
  </div>
)

/**
 * Original HDN canvas first. The Moroccan road is a color-graded depth layer
 * inside that atmosphere — never a replacement landscape.
 */
export default function HeroWorld({ camera, reduceMotion }) {
  const {
    atmosphereY,
    farX,
    farY,
    hazeX,
    lightX,
    lightY,
    worldScale,
    worldX,
    worldY,
  } = camera

  return (
    <div className="hero-world" aria-hidden="true">
      <div className="hero-canvas">
        <div className="hero-canvas-blush" />
        <div className="hero-canvas-sand" />
        <div className="hero-floor-sheen" />
        <div className="hero-arch hero-arch-a" />
        <div className="hero-arch hero-arch-b" />
        <div className="hero-volume" />
        <div className="hero-haze" />
        <div className="hero-horizon" />
      </div>

      <Motion.div
        className="hero-world-rig"
        style={
          reduceMotion
            ? undefined
            : { scale: worldScale, x: worldX, y: worldY }
        }
      >
        <Motion.div
          className={`hero-far${reduceMotion ? ' is-still' : ''}`}
          style={reduceMotion ? undefined : { x: farX, y: farY }}
        >
          <Plate className="hero-plate hero-plate-far" position="50% 38%" />
        </Motion.div>

        <div className={`hero-near${reduceMotion ? ' is-still' : ''}`}>
          <Plate className="hero-plate hero-plate-near" position="50% 68%" />
        </div>

        <div className={`hero-road-specular${reduceMotion ? '' : ' is-live'}`} />
      </Motion.div>

      <Motion.div
        className="hero-atmosphere"
        style={reduceMotion ? undefined : { y: atmosphereY, x: hazeX }}
      >
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
