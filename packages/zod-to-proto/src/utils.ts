import { ZodNumber } from 'zod'
import type { ProtobufField } from './types'

export const getNumberTypeName = ({ value }: { value: ZodNumber }): string => {
	return value.isInt ? 'int32' : 'double'
}

export const toPascalCase = ({ value }: { value: string }): string => {
	return value
		.split('.')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

export const protobufFieldToType = ({ field }: { field: ProtobufField }): string => {
	return field.types.filter(Boolean).join(' ')
}

