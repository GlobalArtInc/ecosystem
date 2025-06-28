import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import type { ReactNode } from 'react';

interface FeatureProps {
  title: string;
  description: string;
  icon: string;
  link: string;
}

const features: FeatureProps[] = [
  {
    title: 'Swagger Documentation',
    description: 'Simplify OpenAPI documentation with intuitive decorators and pre-configured error descriptions.',
    icon: '📝',
    link: '/packages/nestjs-swagger',
  },
  {
    title: 'TypeORM Pagination',
    description: 'Effortless pagination with built-in filtering, sorting, and search capabilities.',
    icon: '📄',
    link: '/packages/nestjs-typeorm-pagination',
  },
  {
    title: 'Microservices Toolkit',
    description: 'Simple decorators for TCP, Redis, MQTT, gRPC, NATS, RabbitMQ, and Kafka transport patterns.',
    icon: '🔗',
    link: '/packages/nestjs-microservices',
  },
  {
    title: 'Logger Utilities',
    description: 'Advanced logging capabilities with structured output and multiple transport options.',
    icon: '📊',
    link: '/packages/nestjs-logger',
  },
  {
    title: 'DDD Toolkit',
    description: 'Domain-driven design patterns and utilities for building scalable applications.',
    icon: '🏗️',
    link: '/packages/ddd',
  },
];

function Feature({ title, description, icon, link }: FeatureProps): ReactNode {
  return (
    <div className="col col--4 margin-bottom--lg">
      <div className="card">
        <div className="card__header">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
          <Heading as="h3">{title}</Heading>
        </div>
        <div className="card__body">
          <p>{description}</p>
        </div>
        <div className="card__footer">
          <Link className="button button--primary button--block" to={link}>
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomepageHeader(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className="hero hero--primary">
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className="hero__buttons">
          <Link
            className="button button--secondary button--lg margin-right--md"
            to="/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/GlobalArtInc/ecosystem"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Bundles for development"
    >
      <HomepageHeader />
      <main>
        <section className="padding-vert--xl">
          <div className="container">
            <div className="row">
              {features.map((feature, idx) => (
                <Feature key={idx} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="hero hero--dark">
          <div className="container">
            <div className="row">
              <div className="col col--8 col--offset-2 text--center">
                <Heading as="h2">Ready to Get Started?</Heading>
                <p>
                  Choose the packages that fit your project needs and start building better NestJS applications today.
                </p>
                <div className="margin-top--lg">
                  <Link
                    className="button button--primary button--lg margin-right--md"
                    to="/intro"
                  >
                    Documentation
                  </Link>
                  <Link
                    className="button button--outline button--primary button--lg"
                    to="/packages"
                  >
                    Browse Packages
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}