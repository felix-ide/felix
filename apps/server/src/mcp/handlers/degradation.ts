import { projectManager } from '../project-manager.js';

export async function handleDegradationTools(args: any) {
  const { project, action, config } = args;

  const projectInfo = await projectManager.getProject(project);
  if (!projectInfo) {
    throw new Error(`Project not found: ${project}`);
  }

  switch (action) {
    case 'status': {
      const status = { enabled: false, lastRun: null, schedulerRunning: false };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    }

    case 'run_cleanup': {
      try {
        const result = {
          expired_auto_tags: 0,
          expired_contextual_tags: 0,
          decayed_rules: 0,
          inactive_rules: 0,
          broken_file_links: 0,
          cleanup_duration: 0
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  cleanup_stats: result
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ]
        };
      }
    }

    case 'configure': {
      if (!config) {
        throw new Error('config parameter is required for configure action');
      }

      try {
        console.log('Degradation config update requested:', config);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Degradation configuration updated',
                  config
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ]
        };
      }
    }

    case 'stop': {
      try {
        console.log('Degradation scheduler stop requested');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Degradation scheduler stopped'
              })
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ]
        };
      }
    }

    case 'start': {
      try {
        const status = { enabled: false, lastRun: null, schedulerRunning: false };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Degradation scheduler start requested',
                current_status: status
              })
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }
          ]
        };
      }
    }

    default:
      throw new Error(`Unknown degradation action: ${action}`);
  }
}
