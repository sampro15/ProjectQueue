import swaggerJsdoc from 'swagger-jsdoc';
import { taskParamsSchema } from './taskParamsSchema';

// Define the base OpenAPI specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PhotoMesh Queue API Documentation',
    version: '1.0.0',
    description: `PhotoMesh's Queue REST API enables you to create a project queue and then activate, monitor, and manage queue processing. The API streamlines photogrammetry workflows from data import to final model generation.

## Key capabilities:
- **Status Monitoring**: Check manager status and retrieve processing logs
- **Queue Management**: Create project queues with task sequences
- **Build Control**: Start, monitor, and abort builds
- **Project Configuration**: Set project parameters and variables
- **Data Import**: Import images, control points, and trajectories
- **Task Automation**: Chain tasks with conditional paths
- **Status Monitoring**: Check processing status and logs
    `,
    contact: {
      name: 'PhotoMesh Support',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'PhotoMesh API Server',
    },
  ],
  tags: [
    {
      name: 'Build Management',
      description: 'Operations related to build processes',
    },
    {
      name: 'PhotoMesh Queue Manager',
      description: 'Queue management operations',
    },
    {
      name: 'Queue Management',
      description: 'Operations for managing the processing queue',
    },
    {
      name: 'Project Management',
      description: 'Operations for managing projects',
    },
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
        },
      },
      task_params: taskParamsSchema.task_params,
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: openApiSpec,
  apis: [
    './server/controllers/*.ts',
    './services/NewProjectQueue/server/controllers/*.ts',
    './server/types/*.ts',
    './services/NewProjectQueue/server/types/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Merge tags and schemas carefully
const mergedTags = [
  ...(openApiSpec.tags || []),
  ...((swaggerSpec as any).tags || []).filter(
    (tag: any) => !(openApiSpec.tags || []).some((t: any) => t.name === tag.name)
  ),
];

const mergedSchemas = {
  ...openApiSpec.components.schemas,
  ...((swaggerSpec as any).components?.schemas || {}),
};

const finalSpec = {
  ...openApiSpec,
  ...swaggerSpec,
  tags: mergedTags,
  paths: (swaggerSpec as any).paths,
  components: {
    ...openApiSpec.components,
    ...(swaggerSpec as any).components,
    schemas: mergedSchemas,
  },
};

export { finalSpec as swaggerSpec };
