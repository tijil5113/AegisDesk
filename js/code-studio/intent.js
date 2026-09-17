/**
 * Aegis Code Studio — client-side intent routing.
 * Greetings and questions stay with Companion. Outcomes go to Agent.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AegisStudio = root.AegisStudio || {};
    root.AegisStudio.intent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var GREETING = /^(hi|hello|hey|howdy|yo|sup|hiya|good\s+(morning|afternoon|evening)|how are you|how's it going|what'?s up)[\s!.,?]*$/i;
    var CAPABILITY = /^(what can you do|who are you|help|what is this|what are you)[\s!.,?]*$/i;
    var HANDOFF = /^(?:(?:yes|yeah|yep|yup|ok|okay|sure|please)[,.]?\s+)*(?:do it|go ahead|implement(?: it)?|make (?:those|the) changes|apply(?: it| that| those)?|fix (?:it|them|that)|ship it)[\s!.,?]*$/i;
    var EXPLICIT_COMPANION = /\b(explain|why|what does|what would you|how (does|do|would|should)|review (this|my|the)|walk me through|help me (think|understand)|looks? bad|what's wrong)\b/i;
    var EXPLICIT_AGENT = /\b(fix( this| every| all| the)?|build|create|implement|scaffold|generate|add (a |an |the )?(dark mode|page|file|component)|make (the |this |it )?(responsive|mobile|dark)|refactor|rename|delete file|run (the )?tests and fix|repair)\b/i;
    var SLASH_AGENT = /^\/(fix|build|test|preview|revert)\b/i;
    var SLASH_COMPANION = /^\/(explain|review|changes)\b/i;

    function classify(text, extras) {
        extras = extras || {};
        var raw = String(text || '').trim();
        var surface = extras.surface === 'agent' ? 'agent' : 'companion';
        var hasProposal = !!extras.hasProposal;

        if (!raw) {
            return { surface: surface, launchTools: false, reason: 'empty', handoff: false };
        }
        if (SLASH_COMPANION.test(raw)) {
            return { surface: 'companion', launchTools: false, reason: 'slash-companion', handoff: false, command: raw.split(/\s+/)[0].slice(1) };
        }
        if (SLASH_AGENT.test(raw)) {
            return { surface: 'agent', launchTools: true, reason: 'slash-agent', handoff: false, command: raw.split(/\s+/)[0].slice(1) };
        }
        if (GREETING.test(raw) || CAPABILITY.test(raw)) {
            return { surface: 'companion', launchTools: false, reason: 'greeting', handoff: false };
        }
        if (hasProposal && (HANDOFF.test(raw) || /^(yes|yeah|yep|yup|ok|okay|sure)[\s!.,?]*$/i.test(raw))) {
            return { surface: 'agent', launchTools: true, reason: 'handoff', handoff: true };
        }
        if (EXPLICIT_COMPANION.test(raw) && !EXPLICIT_AGENT.test(raw)) {
            return { surface: 'companion', launchTools: false, reason: 'question', handoff: false };
        }
        if (EXPLICIT_AGENT.test(raw)) {
            return { surface: 'agent', launchTools: true, reason: 'outcome', handoff: false };
        }
        if (surface === 'agent') {
            return { surface: 'agent', launchTools: true, reason: 'agent-surface', handoff: false };
        }
        return { surface: 'companion', launchTools: false, reason: 'companion-default', handoff: false };
    }

    function isGreeting(text) {
        var raw = String(text || '').trim();
        return GREETING.test(raw) || CAPABILITY.test(raw);
    }

    return {
        classify: classify,
        isGreeting: isGreeting
    };
});
