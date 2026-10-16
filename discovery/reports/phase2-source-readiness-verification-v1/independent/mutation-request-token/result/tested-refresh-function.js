  async function loadBenchmarks() {
    const readinessRequest = ++sourceReadinessRequest;
    window.LupineSourceReadiness.render(null);
    $('benchmark-status').hidden = false;
    $('benchmark-status').className = 'notice';
    $('benchmark-status').textContent = 'Running the known-answer suite and loading recorded archive evaluations…';
    try {
      const report = await api('/api/benchmarks');
      renderKnown(report.known_answers); renderArchives(report.archived, report.additional_archived); renderConstrained(report.constrained_archived); renderTrainingTail(report.training_tail); window.LupineMpea.render(report.mpea_archived); window.LupineRecordedCensus.render(report.recorded_census);
      window.LupineSourceReadiness.render(report.source_readiness);
      if (!$('refresh-benchmarks')) {
        const refresh = node('button', 'button button-outline button-small', '↻ Run known-answer suite again');
        refresh.id = 'refresh-benchmarks'; refresh.addEventListener('click', loadBenchmarks);
        $('suite-metrics').insertAdjacentElement('afterend', refresh);
      }
      $('benchmark-content').hidden = false;
      $('benchmark-status').hidden = true;
      state.benchmarksLoaded = true;
    } catch (error) {
      $('benchmark-status').className = 'notice error';
      $('benchmark-status').replaceChildren(document.createTextNode(error.message + ' '));
      const retry = node('button', 'text-button', 'Retry'); retry.addEventListener('click', loadBenchmarks); $('benchmark-status').append(retry);
    }
  }
