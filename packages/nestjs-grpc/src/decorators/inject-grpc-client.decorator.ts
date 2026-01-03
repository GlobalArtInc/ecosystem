import { Inject } from '@nestjs/common'
import { GRPC_CLIENT_PREFIX } from '../constants/grpc.constants'

export const InjectGrpcClient = (name: string) =>
	Inject(`${GRPC_CLIENT_PREFIX}_${name}`)
