import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Response } from 'express'
import type { AuthRequest, Config } from '../../types'
import CookieAuthMiddleware from './cookie-auth.middleware'
import { TwakeLogger } from '../../../logger'

const loggerMock = {
  info: vi.fn(),
  error: vi.fn()
} as unknown as TwakeLogger

const getAccessTokenWithCookieMock = vi.fn()

vi.mock('../services/token-service.ts', () => {
  return {
    default: function () {
      return {
        getAccessTokenWithCookie: getAccessTokenWithCookieMock
      }
    }
  }
})
let mockRequest: Partial<AuthRequest>
let mockResponse: Partial<Response>

describe('the Auth with cookies middleware', () => {
  const nextFunction: NextFunction = vi.fn()

  const middleware = new CookieAuthMiddleware(
    {} as unknown as Config,
    loggerMock
  )

  beforeEach(() => {
    getAccessTokenWithCookieMock.mockClear()

    mockRequest = {
      cookies: {},
      headers: {
        authorization: undefined,
        cookies: undefined
      }
    }
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    }
  })

  describe('the authenticateWithCookie handler', () => {
    it('should set the authorization header with obtained token', async () => {
      const token = 'token'
      getAccessTokenWithCookieMock.mockResolvedValue(token)

      mockRequest = {
        headers: {
          cookie: 'lemonldap=testcookie'
        }
      }

      await middleware.authenticateWithCookie(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      )
      expect(getAccessTokenWithCookieMock).toHaveBeenCalledWith(
        'lemonldap=testcookie'
      )
      expect(mockRequest.headers?.authorization).toBe(`Bearer ${token}`)
    })

    it('should not set the authorization header if no cookie is provided', async () => {
      await middleware.authenticateWithCookie(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      )

      expect(mockRequest.headers?.authorization).toBeUndefined()
    })

    it('should skip authenticating with cookie when the request has already authorization header', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer token'
        }
      }

      await middleware.authenticateWithCookie(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      )

      expect(getAccessTokenWithCookieMock).not.toHaveBeenCalled()
    })

    it('should not modify the headers if something wrong happens', async () => {
      getAccessTokenWithCookieMock.mockRejectedValue(new Error('error'))

      mockRequest = {
        headers: {
          cookie: 'lemonldap=testcookie'
        }
      }

      await middleware.authenticateWithCookie(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      )

      expect(mockRequest.headers?.authorization).toBeUndefined()
    })
  })
})
