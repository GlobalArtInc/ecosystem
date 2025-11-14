import type { ZodTypeAny } from 'zod'
import type { ServiceDefinition, ServiceMethod } from './types'
import { toPascalCase } from './utils'
import { traverseSchema } from './traversers'

interface ServiceGenerationContext {
	messages: Map<string, string[]>
	enums: Map<string, string[]>
	typePrefix: string | null
}

const generateRequestMessageName = (methodName: string, typePrefix: string | null): string => {
	const messageName = toPascalCase({ value: `${methodName}Request` })
	return typePrefix ? `${typePrefix}${messageName}` : messageName
}

const generateResponseMessageName = (methodName: string, typePrefix: string | null): string => {
	const messageName = toPascalCase({ value: `${methodName}Response` })
	return typePrefix ? `${typePrefix}${messageName}` : messageName
}

const processServiceMethod = (
	method: ServiceMethod,
	context: ServiceGenerationContext
): { requestName: string; responseName: string } => {
	const { messages, enums, typePrefix } = context

	const requestName = generateRequestMessageName(method.name, typePrefix)
	const responseName = generateResponseMessageName(method.name, typePrefix)

	if (!messages.has(requestName)) {
		const requestFields = traverseSchema({
			schema: method.request,
			messages,
			enums,
			typePrefix
		})
		messages.set(requestName, requestFields)
	}

	if (!messages.has(responseName)) {
		const responseFields = traverseSchema({
			schema: method.response,
			messages,
			enums,
			typePrefix
		})
		messages.set(responseName, responseFields)
	}

	return { requestName, responseName }
}

export const generateServices = (
	services: ServiceDefinition[],
	context: ServiceGenerationContext
): string[] => {
	return services.map((service) => {
		const methods = service.methods.map((method) => {
			const { requestName, responseName } = processServiceMethod(method, context)

			const requestStreaming = method.streaming === 'client' || method.streaming === 'bidirectional'
			const responseStreaming = method.streaming === 'server' || method.streaming === 'bidirectional'

			const requestType = requestStreaming ? `stream ${requestName}` : requestName
			const responseType = responseStreaming ? `stream ${responseName}` : responseName

			return `    rpc ${method.name}(${requestType}) returns (${responseType});`
		})

		return `service ${service.name} {\n${methods.join('\n')}\n}`
	})
}

