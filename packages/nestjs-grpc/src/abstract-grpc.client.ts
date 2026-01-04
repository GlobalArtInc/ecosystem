import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

type UnwrapObservable<U> = U extends Observable<infer R> ? R : U;

export abstract class AbstractGrpcClient {
	protected constructor(
		private readonly client: ClientGrpc,
	) {}

	public async call<T extends Record<string, any>>(serviceName: string, methodName: string, payload: Parameters<T[keyof T]>[0] = {}): Promise<UnwrapObservable<ReturnType<T[keyof T]>>> {
		try {
      const service = this.client.getService<T>(serviceName);

      return firstValueFrom(service[methodName](payload));
		} catch (error) {
			throw error
		}
	}
}