import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import autocompletion from '../autocompletion'
import { jsonContent, validateParameters } from '../../../../utils'
import _search from '../_search'

vi.mock('../../../../utils/index',
  () => ({
    jsonContent: vi.fn((req, res, logger, callback) => callback(req.body)),
    validateParameters: vi.fn((res, schema, obj, logger, callback) =>
      callback(obj)
    )
  })
)

vi.mock('../_search', () => ({ default: vi.fn(() => vi.fn()) }))

// Mock service instances
const createMockServices = () => ({
  addressbookService: {
    list: vi.fn().mockResolvedValue({ contacts: [] })
  } as any,
  userInfoService: {
    get: vi.fn().mockResolvedValue(null)
  } as any
})

describe('autocompletion handler', () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  const idServer = {
    authenticate: vi.fn(),
    conf: { server_name: 'server' }
  }

  const resMock = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call search with owner from token.sub', async () => {
    const mockSearch = vi.fn()
    ;(_search as Mock<(...args: any[]) => any>).mockResolvedValue(mockSearch)

    const { addressbookService, userInfoService } = createMockServices()
    const handler = await autocompletion(
      idServer as any,
      logger as any,
      addressbookService,
      userInfoService
    )

    idServer.authenticate.mockImplementation((req, res, cb) => {
      cb({ sub: '@drwho:server' }, 'id')
    })

    const reqMock = {
      body: { val: 'doctor', scope: ['uid'] }
    }

    await handler(reqMock as any, resMock)

    expect(idServer.authenticate).toHaveBeenCalled()
    expect(jsonContent).toHaveBeenCalled()
    expect(validateParameters).toHaveBeenCalled()

    expect(mockSearch).toHaveBeenCalledWith(resMock, {
      val: 'doctor',
      scope: ['uid'],
      owner: '@drwho:server'
    })
  })

  it('should fallback to default owner when token.sub is missing', async () => {
    const mockSearch = vi.fn()
    ;(_search as Mock<(...args: any[]) => any>).mockResolvedValue(mockSearch)

    const { addressbookService, userInfoService } = createMockServices()
    const handler = await autocompletion(
      idServer as any,
      logger as any,
      addressbookService,
      userInfoService
    )

    idServer.authenticate.mockImplementation((req, res, cb) => {
      cb({}, 'id') // no sub
    })

    const reqMock = {
      body: { val: 'tardis', scope: ['uid'] }
    }

    await handler(reqMock as any, resMock)

    expect(mockSearch).toHaveBeenCalledWith(resMock, {
      val: 'tardis',
      scope: ['uid'],
      owner: '@default:server'
    })
  })
})
