import { Injectable } from '@nestjs/common';
import { Redlock } from './core';

@Injectable()
export class RedlockService extends Redlock {}
