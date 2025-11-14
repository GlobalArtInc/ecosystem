import type { ZodTypeAny } from 'zod'

export interface ZodToProtobufOptions {
	packageName?: string
	rootMessageName?: string
	typePrefix?: string
	services?: ServiceDefinition[]
	skipRootMessage?: boolean
}

export interface ServiceMethod {
	name: string
	request: ZodTypeAny
	response: ZodTypeAny
	streaming?: 'client' | 'server' | 'bidirectional'
}

export interface ServiceDefinition {
	name: string
	methods: ServiceMethod[]
}

export class UnsupportedTypeException extends Error {
	constructor(type: string) {
		super(`Unsupported type: ${type}`)
		this.name = 'UnsupportedTypeException'
	}
}

export interface ProtobufField {
	types: Array<string | null>
	name: string
}

