// Posts a comment + moves Plane state for every DES-### referenced in the PR.
// Invoked from .github/workflows/plane-sync.yml via actions/github-script.
//
// Required env (set in the workflow step):
//   PLANE_API_TOKEN        — secret, X-API-Key header
//   PLANE_BASE_URL         — e.g. https://plane.readysetllc.com/api/v1
//   PLANE_WORKSPACE_SLUG   — e.g. ready-set-llc
//   PLANE_PROJECT_ID       — UUID of the destino-sf project
//   PLANE_TARGET_STATE     — UUID of the state to transition to
//   PLANE_VERB             — "opened" | "merged" (used in the comment text)

module.exports = async ({ context, core }) => {
  const {
    PLANE_API_TOKEN: token,
    PLANE_BASE_URL: baseUrl,
    PLANE_WORKSPACE_SLUG: slug,
    PLANE_PROJECT_ID: projectId,
    PLANE_TARGET_STATE: targetState,
    PLANE_VERB: verb,
  } = process.env;

  for (const [k, v] of Object.entries({ token, baseUrl, slug, projectId, targetState, verb })) {
    if (!v) {
      core.setFailed(`Missing env var: ${k}`);
      return;
    }
  }

  const pr = context.payload.pull_request;
  const text = `${pr.title}\n${pr.body || ''}`;
  const refs = [...new Set(text.match(/\bDES-\d+\b/g) || [])];
  if (refs.length === 0) {
    core.info('No DES-### refs found — nothing to sync.');
    return;
  }

  const issuesUrl = `${baseUrl}/workspaces/${slug}/projects/${projectId}/issues/`;
  const headers = { 'X-API-Key': token, 'Content-Type': 'application/json' };

  // Path-style readable-id lookup (e.g. /issues/DES-92/) returns 404 on this
  // self-hosted Plane build, and the ?sequence_id / ?search query params are
  // ignored. Workaround: fetch the active issues list once and filter
  // client-side. The list endpoint excludes archived issues automatically and
  // returns up to 1000 per page, which is well above any active board size.
  const listRes = await fetch(`${issuesUrl}?per_page=1000`, { headers });
  if (!listRes.ok) {
    core.setFailed(`Plane list issues failed: ${listRes.status} ${await listRes.text()}`);
    return;
  }
  const list = await listRes.json();
  const bySeq = new Map((list.results || []).map((r) => [r.sequence_id, r]));

  for (const ref of refs) {
    const seq = Number(ref.split('-')[1]);
    const issue = bySeq.get(seq);
    if (!issue) {
      core.warning(`${ref} not found among active issues — skipped.`);
      continue;
    }

    const commentRes = await fetch(`${issuesUrl}${issue.id}/comments/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        comment_html: `<p>PR ${verb}: <a href="${pr.html_url}">${pr.html_url}</a></p>`,
      }),
    });
    if (!commentRes.ok) {
      core.warning(`Comment on ${ref} failed: ${commentRes.status} ${await commentRes.text()}`);
    }

    const stateRes = await fetch(`${issuesUrl}${issue.id}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: targetState }),
    });
    if (!stateRes.ok) {
      core.warning(`State update on ${ref} failed: ${stateRes.status} ${await stateRes.text()}`);
      continue;
    }

    core.info(`${ref}: commented + transitioned to ${targetState}.`);
  }
};
