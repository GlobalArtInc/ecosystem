import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

type UnwrapObservable<U> = U extends Observable<infer R> ? R : U;

export abstract class AbstractGrpcClient {
	protected constructor(
		private readonly client: ClientGrpc,
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

	public async call<T extends object, K extends keyof T>(
		serviceName: string,
		methodName: K,
		payload: T[K] extends (...args: infer P) => any ? P[0] : never = {} as any,
	): Promise<T[K] extends (...args: any) => any ? UnwrapObservable<ReturnType<T[K]>> : never> {
		try {
			const service = this.client.getService<T>(serviceName);

			const method = service[methodName] as unknown as (...args: any[]) => Observable<any>;

			return await firstValueFrom(method(payload));
		} catch (error) {
			throw error;
		}
	}
}
