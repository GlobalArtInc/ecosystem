import Heading from '@theme/Heading';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg?: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Swagger Documentation',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Simplify OpenAPI documentation generation with our <code>@globalart/nestjs-swagger</code> package.
        Create comprehensive API documentation with minimal effort using our intuitive decorators.
      </>
    ),
  },
  {
    title: 'TypeORM Pagination',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Implement pagination effortlessly with <code>@globalart/nestjs-typeorm-pagination</code>.
        Built-in decorators and DTOs make pagination a breeze in your NestJS applications.
      </>
    ),
  },
];

function getColumnClass(totalItems: number): string {
  if (totalItems === 1) return 'col col--12';
  if (totalItems === 2) return 'col col--6';
  if (totalItems === 4) return 'col col--3';
  return 'col col--4';
}

function Feature({ title, Svg, description, totalItems }: FeatureItem & { totalItems: number }) {
  return (
    <div className={clsx(getColumnClass(totalItems))}>
      {/* <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div> */}
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  const totalItems = FeatureList.length;

  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} totalItems={totalItems} />
          ))}
        </div>
      </div>
    </section>
  );
}
