export const EDGE_ROLL_DURATION = 0.72
export const CORNER_LIFT_DURATION = 0.84
export const MAIN_SPIN_START = EDGE_ROLL_DURATION + CORNER_LIFT_DURATION

const DRIVE_DURATION = 0.58
const DRIVE_TORQUE = 42
const LINEAR_DRAG = 0.18
const QUADRATIC_DRAG = 0.008
const COULOMB_DRAG = 0.32
const FINAL_BRAKE_START = 10.25
const FINAL_BRAKE_DURATION = 1.05
const FINAL_BRAKE_TORQUE = 11
const STATIC_FRICTION_SPEED = 0.1
const MAX_STEP = 1 / 240

export class SpinSimulation {
  elapsed = 0
  angle = 0
  angularVelocity = 0
  settled = false

  get mainElapsed() {
    return Math.max(0, this.elapsed - MAIN_SPIN_START)
  }

  update(delta: number) {
    let remaining = Math.min(delta, 1 / 20)

    if (this.settled) {
      this.elapsed += remaining
      return
    }

    while (remaining > 0) {
      const step = Math.min(remaining, MAX_STEP)
      const driveProgress = Math.min(1, this.mainElapsed / DRIVE_DURATION)
      const driveTorque =
        this.elapsed >= MAIN_SPIN_START && this.mainElapsed < DRIVE_DURATION
          ? DRIVE_TORQUE * Math.sin(Math.PI * driveProgress) ** 2
          : 0
      const dragTorque =
        this.angularVelocity > 0
          ? LINEAR_DRAG * this.angularVelocity +
            QUADRATIC_DRAG *
              this.angularVelocity *
              Math.abs(this.angularVelocity) +
            COULOMB_DRAG +
            FINAL_BRAKE_TORQUE *
              Math.min(
                1,
                Math.max(
                  0,
                  (this.mainElapsed - FINAL_BRAKE_START) /
                    FINAL_BRAKE_DURATION,
                ),
              ) **
                2
          : 0
      const angularAcceleration = driveTorque - dragTorque

      this.angularVelocity = Math.max(
        0,
        this.angularVelocity + angularAcceleration * step,
      )
      this.angle += this.angularVelocity * step
      this.elapsed += step
      remaining -= step

      if (
        this.mainElapsed >= DRIVE_DURATION &&
        this.angularVelocity < STATIC_FRICTION_SPEED
      ) {
        this.angularVelocity = 0
        this.settled = true
        remaining = 0
      }
    }
  }
}
