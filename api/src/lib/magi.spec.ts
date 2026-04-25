import { magi, MagiService, MagiError } from './magi'

describe('magi', () => {
  it('returns the value that meets required agreements', async () => {
    const calls = ['yes', 'yes', 'no', 'yes']
    let i = 0
    const fn = async () => calls[i++]
    await expect(magi(fn, 3, 4)).resolves.toBe('yes')
  })

  it('picks the highest-count winner when multiple values exceed threshold', async () => {
    // 3x 'a', 2x 'b' — both ≥ 2, but 'a' wins
    const calls = ['a', 'b', 'a', 'b', 'a']
    let i = 0
    await expect(magi(async () => calls[i++], 2, 5)).resolves.toBe('a')
  })

  it('throws MagiError when no consensus is reached', async () => {
    const calls = ['x', 'y', 'x', 'y', 'z']
    let i = 0
    const err = await magi(async () => calls[i++], 3, 5).catch((e) => e)
    expect(err).toBeInstanceOf(MagiError)
    expect(err.trials).toBe(5)
    expect(err.requiredAgreements).toBe(3)
  })

  it('works with boolean values', async () => {
    const calls = [true, false, true, true]
    let i = 0
    await expect(magi(async () => calls[i++], 3, 4)).resolves.toBe(true)
  })

  it('works with number values', async () => {
    const calls = [42, 7, 42, 42]
    let i = 0
    await expect(magi(async () => calls[i++], 3, 4)).resolves.toBe(42)
  })

  it('stops early when consensus is unreachable', async () => {
    let callCount = 0
    const calls = ['a', 'a', 'a', 'b', 'b']
    const fn = async () => {
      callCount++
      return calls[callCount - 1]
    }
    // After 3 'a' results, remaining trials cannot catch up → exits early
    await magi(fn, 3, 5)
    expect(callCount).toBeLessThan(5)
  })

  it('throws RangeError for invalid arguments', async () => {
    await expect(magi(async () => 'x', 0, 3)).rejects.toThrow(RangeError)
    await expect(magi(async () => 'x', 4, 3)).rejects.toThrow(RangeError)
  })
})

describe('MagiService', () => {
  it('uses preset defaults', async () => {
    const service = new MagiService({ trials: 3, requiredAgreements: 2 })
    const calls = ['yes', 'yes', 'no']
    let i = 0
    await expect(service.run(async () => calls[i++])).resolves.toBe('yes')
  })

  it('allows per-call overrides', async () => {
    const service = new MagiService({ trials: 3, requiredAgreements: 2 })
    const calls = ['a', 'a', 'a', 'a', 'b']
    let i = 0
    await expect(
      service.run(async () => calls[i++], { trials: 5, requiredAgreements: 4 }),
    ).resolves.toBe('a')
  })
})
