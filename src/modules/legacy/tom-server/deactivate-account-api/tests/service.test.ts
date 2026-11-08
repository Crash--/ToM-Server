import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type TwakeLogger } from '../../../logger'
import Service from '../services'
import type { Config } from '../../types'
import { IAdminService } from '../types'

const loggerMock = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}

const tokenServiceSpy = vi.fn()

vi.mock('../../utils/services/token-service.ts', () => {
  return {
    default: function () {
      return {
        getAccessTokenWithCreds: tokenServiceSpy
      }
    }
  }
})

let service: IAdminService

beforeEach(() => {
  vi.resetAllMocks()
  service = new Service(
    {
      matrix_admin_login: 'admin',
      matrix_admin_password: 'XXXXX',
      matrix_server: 'https://localhost'
    } as unknown as Config,
    loggerMock as unknown as TwakeLogger
  )
})

describe('the admin service', () => {
  describe('the removeAccount method', () => {
    it('should try to get an admin access token', async () => {
      tokenServiceSpy.mockResolvedValueOnce('some_access_token')
      global.fetch = vi.fn()
      await service.removeAccount('some_user_id')

      expect(tokenServiceSpy).toHaveBeenCalledWith('admin', 'XXXXX')
    })

    it('should call the deleteUserMedia and disableUserAccount methods', async () => {
      tokenServiceSpy.mockResolvedValueOnce('some_access_token')
      global.fetch = vi.fn()
      service.deleteUserMedia = vi.fn()
      service.disableUserAccount = vi.fn()

      await service.removeAccount('some_user_id')

      expect(service.deleteUserMedia).toHaveBeenCalledWith(
        'some_user_id',
        'some_access_token'
      )
      expect(service.disableUserAccount).toHaveBeenCalledWith(
        'some_user_id',
        'some_access_token'
      )
    })

    it('should throw an error if it fails to obtain an admin access token', async () => {
      tokenServiceSpy.mockRejectedValueOnce(new Error('some_error'))
      global.fetch = vi.fn()

      await expect(service.removeAccount('some_user_id')).rejects.toThrow()
    })

    it('should throw an error if something wrong happens while calling the deleteUserMedia method', async () => {
      tokenServiceSpy.mockResolvedValueOnce('some_access_token')
      global.fetch = vi.fn()
      service.deleteUserMedia = vi.fn()
        .mockRejectedValueOnce(new Error('some_error'))
      service.disableUserAccount = vi.fn()

      await expect(service.removeAccount('some_user_id')).rejects.toThrow()
    })

    it('should throw an error if something weong happens while calling the disableUserAccount method', async () => {
      tokenServiceSpy.mockResolvedValueOnce('some_access_token')
      global.fetch = vi.fn()
      service.deleteUserMedia = vi.fn()
      service.disableUserAccount = vi.fn()
        .mockRejectedValueOnce(new Error('some_error'))

      await expect(service.removeAccount('some_user_id')).rejects.toThrow()
    })
  })

  describe('the deleteUserMedia method', () => {
    it('should call the synapse admin API to delete user media', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ total: 1 })
      })

      await service.deleteUserMedia('some_user_id', 'some_access_token')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost/_synapse/admin/v1/users/some_user_id/media',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer some_access_token'
          }
        }
      )
    })

    it('should log an error if the synapse admin API call fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('some_error'))

      await service.deleteUserMedia('some_user_id', 'some_access_token')

      expect(loggerMock.error).toHaveBeenCalled()
    })

    it('should log an error if the synapse admin API returns a bad response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ somethingelse: true })
      })

      await service.deleteUserMedia('some_user_id', 'some_access_token')

      expect(loggerMock.error).toHaveBeenCalled()
    })
  })

  describe('the disableUserAccount', () => {
    it('should call the synapse admin API to disable the user account', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ total: 1 })
      })

      await service.disableUserAccount('some_user_id', 'some_access_token')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://localhost/_synapse/admin/v1/deactivate/some_user_id',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer some_access_token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ erase: true })
        }
      )
    })

    it('should throw an error if the synapse admin API call fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('some_error'))

      await expect(
        service.disableUserAccount('some_user_id', 'some_access_token')
      ).rejects.toThrow()
    })
  })
})
