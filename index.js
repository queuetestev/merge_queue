module.exports = async ({ github, context, core, exec, output_name }) => {
  const fs = require('fs');
  const archive_format = "zip";
  const output = output_name ? output_name : "releaseVersion";
  const workflow_runs = await github.rest.actions.listWorkflowRuns({
      owner: context.repo.owner,
      repo: context.repo.repo,
      branch: process.env.GITHUB_REF_TYPE === "branch" ? process.env.GITHUB_REF_NAME : undefined,
      workflow_id: process.env.ci_workflow_name,
      status: "success",
      head_sha: process.env.GITHUB_SHA,
      per_page: "1",
  });

  core.debug(JSON.stringify(workflow_runs));
  if (workflow_runs && workflow_runs.data.total_count !== 0) {

    let version;
    const sem_regexp = new RegExp(`^v[0-9]+\.[0-9]+\.[0-9]+.*$`);
    const workflow_id = workflow_runs.data.workflow_runs[0].id;
    const allArtifacts = await github.rest.actions.listWorkflowRunArtifacts({ owner: context.repo.owner, repo: context.repo.repo, run_id: workflow_id, });
    console.log(JSON.stringify(allArtifacts));

    const matchArtifact = allArtifacts.data.artifacts.filter((artifact) => {
      version = sem_regexp.exec(artifact.name);
      return version;
    })[0];

    const artifactDownloaded = await github.rest.actions.downloadArtifact({ owner: context.repo.owner, repo: context.repo.repo, artifact_id: matchArtifact.id, archive_format: archive_format, });
    fs.writeFileSync(`${process.env.GITHUB_WORKSPACE}/${version}.${archive_format}`, Buffer.from(artifactDownloaded.data));
    await exec.exec('unzip', ['-o', `${process.env.GITHUB_WORKSPACE}/${version}.${archive_format}`]);
    core.setOutput(output, `${version}`);
  } else {
    core.setFailed("No successful ci jobs were found for this branch last commit");
  }
}
