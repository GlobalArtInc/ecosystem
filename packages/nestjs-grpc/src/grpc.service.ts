import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class GrpcService {
	constructor(private readonly cls: ClsService) {}

	public addMetadata(key: string, value: string): void {
		const metadata = this.cls.get('GRPC_METADATA') || {};
		metadata[key] = value;
		this.cls.set('GRPC_METADATA', metadata);
	}

	public getMetadata(): Record<string, string> {
		return this.cls.get('GRPC_METADATA') || {};
	}
}

