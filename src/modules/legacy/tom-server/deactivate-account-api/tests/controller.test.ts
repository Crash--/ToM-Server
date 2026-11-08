import { TwakeLogger } from '../../../logger'
import bodyParser from 'body-parser'
import express, { NextFunction } from 'express'
import router, { PATH } from '../routes'
import type { AuthRequest, Config, TwakeDB } from '../../types'
import supertest from 'supertest'
import { MatrixDBBackend } from '../../../../matrix-identity-server'
import { describe, expect, it, test, vi } from 'vitest'

const app = express()

const loggerMock = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}

const serviceSpy = vi.fn()

vi.mock('../services/index.ts', () => {
  return {
    default: function () {
      return {
        removeAccount: serviceSpy
      }
    }
  }
})

vi.mock('../middlewares/index.ts', () => {
  const passiveMiddleware = (
    _req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    next()
  }

  return {
    default: function () {
      return {
        checkUserExists: passiveMiddleware,
        checkAccessToken: passiveMiddleware
      }
    }
  }
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(
  router(
    {} as unknown as Config,
    {} as unknown as MatrixDBBackend,
    loggerMock as unknown as TwakeLogger
  )
)

describe('the deactivate user API controller', () => {
  describe('the handle method', () => {
    it('should attempt to call the service correctly', async () => {
      const response = await supertest(app)
        .post(`${PATH}/@test:user.com`)
        .set('x-access-code', 'super secret')
        .send()

      expect(serviceSpy).toHaveBeenCalledWith('@test:user.com')
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ message: 'User deactivated' })
    })

    it('should return 500 if something wrong happens while calling the service', async () => {
      serviceSpy.mockRejectedValueOnce(new Error('Something went wrong'))

      const response = await supertest(app)
        .post(`${PATH}/@test:user.com`)
        .set('x-access-code', 'super secret')
        .send()

      expect(serviceSpy).toHaveBeenCalledWith('@test:user.com')
      expect(response.status).toBe(500)
    })
  })
})
