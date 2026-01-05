import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';

type UnwrapObservable<U> = U extends Observable<infer R> ? R : U;

export abstract class AbstractGrpcClient {
	protected constructor(
		private readonly client: ClientGrpc,
		private readonly cls?: ClsService,
	) {}

	public service<T extends object>(serviceName: string) {
		return {
			call: <K extends keyof T>(
				methodName: K,
				payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any,
			): Promise<T[K] extends (...args: any) => any ? UnwrapObservable<ReturnType<T[K]>> : never> => {
				return this.call<T, K>(serviceName, methodName, payload);
			},
		};
	}

	public addMetadata(key: string, value: string) {
		if (this.cls) {
			const metadata = this.cls.get('GRPC_METADATA') || {};
			metadata[key] = value;
			this.cls.set('GRPC_METADATA', metadata);
		}
	}

	private getMetadata(): Metadata {
		const metadata = new Metadata();
		metadata.set('correlationId', randomUUID());

		if (this.cls) {
			const storedMetadata = this.cls.get('GRPC_METADATA');
			if (storedMetadata) {
				Object.keys(storedMetadata).forEach((key) => {
					metadata.set(key, storedMetadata[key]);
				});
			}
		}

		return metadata;
	}

	public async call<T extends object, K extends keyof T>(
		serviceName: string,
		methodName: K,
		payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any,
	): Promise<T[K] extends (...args: any) => any ? UnwrapObservable<ReturnType<T[K]>> : never> {
		try {
			const service = this.client.getService<T>(serviceName);

			const method = service[methodName] as unknown as (...args: any[]) => Observable<any>;

			return firstValueFrom(method(payload, this.getMetadata()));
		} catch (error) {
			throw error;
		}
	}
}
