import { INestApplication, Injectable } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from '@globalart/nestjs-zod';

type Paths = OpenAPIObject['paths'];

class OpenApiDocsBuilder {
  constructor(
    private readonly doc: OpenAPIObject,
    private readonly metaTags: string[],
  ) {}

  stripMetaTags(): OpenAPIObject {
    return this.mapOperations((op) => ({ ...op, tags: this.removeMeta(op.tags) }));
  }

  filterByTag(tag: string): OpenAPIObject {
    const filteredPaths: Paths = {};
    for (const [path, methods] of Object.entries(this.doc.paths ?? {})) {
      const filteredMethods: Record<string, unknown> = {};
      for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
        const op = operation as { tags?: string[] };
        if (op.tags?.includes(tag)) {
          filteredMethods[method] = { ...op, tags: this.removeMeta(op.tags) };
        }
      }
      if (Object.keys(filteredMethods).length > 0) {
        filteredPaths[path] = filteredMethods as Paths[string];
      }
    }
    return { ...this.doc, paths: filteredPaths };
  }

  private mapOperations(fn: (op: { tags?: string[] }) => unknown): OpenAPIObject {
    const paths: Paths = {};
    for (const [path, methods] of Object.entries(this.doc.paths ?? {})) {
      const mapped: Record<string, unknown> = {};
      for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
        mapped[method] = fn(operation as { tags?: string[] });
      }
      paths[path] = mapped as Paths[string];
    }
    return { ...this.doc, paths };
  }

  private removeMeta(tags?: string[]): string[] {
    return (tags ?? []).filter((t) => !this.metaTags.includes(t));
  }
}

interface Version {
  name: string;
  url: string;
  config: Omit<OpenAPIObject, 'paths'>;
  filterTag?: string;
}

@Injectable()
export class SwaggerService {
  private app: INestApplication | null = null;
  private documents: Record<string, OpenAPIObject> = {};
  private versions: Version[] = [];
  private metaTags: string[] = [];
  private zod = false;

  setApp(app: any) {
    this.app = app;
  }

  setVersions(versions: Version[]) {
    this.versions = versions;
  }

  setMetaTags(tags: string[]) {
    this.metaTags = tags;
  }

  getDocument(key: string, serverUrl?: string): OpenAPIObject | undefined {
    const doc = this.documents[key];
    if (!doc) return undefined;
    if (!serverUrl) return doc;
    return { ...doc, servers: [{ url: serverUrl }] };
  }

  formatZod() {
    this.zod = true;
    for (const key of Object.keys(this.documents)) {
      this.documents[key] = cleanupOpenApiDoc(this.documents[key]);
    }
  }

  init() {
    if (!this.app) {
      throw new Error('App not found');
    }

    for (const version of this.versions) {
      const { config, filterTag, url } = version;
      const tempDoc = SwaggerModule.createDocument(this.app, config);
      const builder = new OpenApiDocsBuilder(tempDoc, this.metaTags);

      const document = filterTag
        ? builder.filterByTag(filterTag)
        : builder.stripMetaTags();

      if (this.zod) {
        this.documents[version.name] = cleanupOpenApiDoc(document);
        SwaggerModule.setup(url, this.app, cleanupOpenApiDoc(document));
      } else {
        this.documents[version.name] = document;
        SwaggerModule.setup(url, this.app, document);
      }
    }
  }
}
