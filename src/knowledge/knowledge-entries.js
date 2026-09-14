(function () {
  'use strict';

  function createKnowledgeEntries(options = {}) {
    const CIRCEA_KNOWLEDGE = options.circeaKnowledge;
    const MCA_KNOWLEDGE = options.mcaKnowledge;
    const SAGITARIO_ACC_KNOWLEDGE = options.sagitarioKnowledge;
    if (!CIRCEA_KNOWLEDGE || !MCA_KNOWLEDGE || !SAGITARIO_ACC_KNOWLEDGE) {
      throw new Error('FlightFlowKnowledgeEntries requer as três bases de conhecimento.');
    }

  function knowledgeEntries() {
    const circea = Array.isArray(CIRCEA_KNOWLEDGE.entries) ? CIRCEA_KNOWLEDGE.entries : [];
    const mca = Array.isArray(MCA_KNOWLEDGE.entries) ? MCA_KNOWLEDGE.entries : [];
    const sagitario = Array.isArray(SAGITARIO_ACC_KNOWLEDGE.entries) ? SAGITARIO_ACC_KNOWLEDGE.entries : [];
    return [...circea, ...mca, ...sagitario];
  }

    return Object.freeze({ knowledgeEntries });
  }

  window.FlightFlowKnowledgeEntries = Object.freeze({
    create: createKnowledgeEntries,
  });
})();
