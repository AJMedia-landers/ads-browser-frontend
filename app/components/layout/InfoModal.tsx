'use client';

interface InfoModalProps {
    topic: string | null;
    onClose: () => void;
}

export default function InfoModal({ topic, onClose }: InfoModalProps) {
    if (!topic) return null;

    const title = topic === 'ads' ? 'Ads Browser'
        : topic === 'mappings' ? 'URL Mappings'
        : topic === 'titles' ? 'Title Mappings'
        : topic === 'categories' ? 'Categories & Normalise Data'
        : '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()}>
                <div className="info-modal-header">
                    <h2>{title}</h2>
                    <button className="close-icon" onClick={onClose}>&times;</button>
                </div>
                <div className="info-modal-body">
                    {topic === 'ads' && <AdsInfo />}
                    {topic === 'mappings' && <MappingsInfo />}
                    {topic === 'titles' && <TitlesInfo />}
                    {topic === 'categories' && <CategoriesInfo />}
                </div>
            </div>
        </div>
    );
}

function AdsInfo() {
    return (
        <>
            <p><strong>What is this?</strong></p>
            <p>This is where you can see every ad we&apos;ve scraped. Pick a country and date range and you&apos;ll get a list of ads &mdash; each one shows the ad image, its title, where it links to, and what category it&apos;s been tagged with (if any).</p>

            <p><strong>Categorising ads</strong></p>
            <p>The main job here is to give each ad a category. When you set a category on an ad (e.g. tagging a Sportsbet ad as &ldquo;Gambling&rdquo;), three things happen:</p>
            <ol>
                <li>That ad gets the category you chose.</li>
                <li>A <strong>URL mapping</strong> is created automatically, so every other ad that links to the same website &mdash; past and future &mdash; gets the same category too. For example, if you categorise one ad pointing to <code>sportsbet.com.au</code>, all 500+ other ads pointing there will also become &ldquo;Gambling&rdquo;.</li>
                <li>A <strong>title mapping</strong> is also created automatically, and all historical ads with that same title get updated too &mdash; even if they link to a different URL.</li>
            </ol>
            <p>URL mappings take precedence over title mappings &mdash; if an ad already has a category from a URL mapping, a title mapping won&apos;t override it. Ads can also be categorised by <strong>AI responses</strong> (automatic categorisation). The &ldquo;type&rdquo; column shows how each ad got its category.</p>

            <p><strong>Filters</strong></p>
            <ul>
                <li><strong>Empty/unknown categories</strong> &mdash; shows only ads that don&apos;t have a category yet. This is the quickest way to find work to do.</li>
                <li><strong>Dedup mode</strong> &mdash; reduces duplicate rows:
                    <ul>
                        <li><em>Unique URLs</em> &mdash; one row per landing page.</li>
                        <li><em>Unique Category + URL</em> &mdash; one row per category/URL combination.</li>
                        <li><em>Unique Title + URL</em> &mdash; one row per title/URL combination.</li>
                    </ul>
                </li>
                <li><strong>Type filter</strong> &mdash; show only ads categorised by a specific method: URL Mapping, Title Mapping, or AI Response.</li>
                <li><strong>Search</strong> &mdash; filter by category name, title text, or landing page URL.</li>
            </ul>

            <p><strong>Not Interested</strong></p>
            <p>If an ad isn&apos;t relevant (e.g. a generic news article, not a real ad), you can mark it as &ldquo;Not Interested&rdquo; to hide it from future review. This removes all ads matching both the landing page URL <em>and</em> the title, so ads from the same source won&apos;t keep reappearing.</p>
        </>
    );
}

function MappingsInfo() {
    return (
        <>
            <p><strong>What is this?</strong></p>
            <p>URL mappings are rules that automatically assign a category to any ad based on its landing page URL. When a new ad comes in, the system checks if its URL matches a mapping &mdash; if it does, the ad gets categorised automatically.</p>

            <p><strong>How does matching work?</strong></p>
            <p>URLs are &ldquo;cleaned&rdquo; before matching: query parameters (tracking codes), www prefixes, and trailing slashes are removed, so <code>https://www.example.com/page?ref=123</code> and <code>https://example.com/page</code> are treated as the same URL.</p>

            <p><strong>What can I do here?</strong></p>
            <ul>
                <li><strong>Add a mapping</strong> &mdash; enter a URL and a category. All existing ads with that URL will be updated immediately.</li>
                <li><strong>Edit a mapping&apos;s category</strong> &mdash; all ads using that URL will be re-categorised.</li>
                <li><strong>Delete a mapping</strong> &mdash; removes the rule (existing ads keep their current category).</li>
                <li><strong>Not Interested</strong> &mdash; marks a URL as irrelevant. This deletes all ads matching the landing page URL <em>and</em> the title, so they won&apos;t reappear.</li>
                <li><strong>Search</strong> by URL or category to find specific mappings.</li>
            </ul>
        </>
    );
}

function TitlesInfo() {
    return (
        <>
            <p><strong>What is this?</strong></p>
            <p>Title mappings work like URL mappings, but they match ads by their <em>title text</em> instead of their URL. This is useful when many different URLs share the same ad title (e.g. a brand running the same ad across many publishers).</p>

            <p><strong>How does matching work?</strong></p>
            <p>Titles are compared with extra whitespace removed, so minor formatting differences are ignored. Title mappings are lower priority than URL mappings &mdash; if an ad matches both a URL mapping and a title mapping, the URL mapping wins.</p>

            <p><strong>What can I do here?</strong></p>
            <ul>
                <li><strong>Add a title mapping</strong> &mdash; enter a title and a category.</li>
                <li><strong>Edit or delete</strong> existing title mappings.</li>
                <li><strong>Search</strong> by title or category.</li>
            </ul>
        </>
    );
}

function CategoriesInfo() {
    return (
        <>
            <p><strong>What is this page?</strong></p>
            <p>This page lists every category in the system and shows how many ads, URL mappings, and title mappings use each one. Use it to spot duplicates and clean things up.</p>

            <p><strong>Merging categories</strong></p>
            <p>If you notice categories that should be one (e.g. &ldquo;Gambling&rdquo; and &ldquo;Online Gambling&rdquo;), click on them to select them &mdash; you can select multiple at once. Then type the name you want to keep and hit merge. Everything using the old names switches to the new one.</p>

            <hr />

            <p><strong>What does &ldquo;Normalise Data&rdquo; do?</strong></p>
            <p>It&apos;s a big cleanup button that fixes two problems at once. It takes a few minutes to run, but you can safely leave it going.</p>

            <p><strong>1. Fixes duplicate category names</strong></p>
            <p>Over time the same category can get entered in slightly different ways. For example, you might have:</p>
            <ul>
                <li>&ldquo;Health &amp; Beauty&rdquo;</li>
                <li>&ldquo;health &amp; beauty&rdquo;</li>
                <li>&ldquo;Health&amp;Beauty&rdquo;</li>
                <li>&ldquo;Health  &amp;  Beauty&rdquo;</li>
            </ul>
            <p>Normalise finds all these variants and merges them into one name &mdash; whichever version is used the most. So if &ldquo;Health &amp; Beauty&rdquo; appears 200 times and &ldquo;health &amp; beauty&rdquo; appears 50 times, everything becomes &ldquo;Health &amp; Beauty&rdquo;.</p>

            <p><strong>2. Fills in missing categories using your existing work</strong></p>
            <p>When you categorise an ad (say you tag <code>sportsbet.com.au</code> as &ldquo;Gambling&rdquo;), that only applies going forward. But there might be hundreds of older ads pointing to <code>sportsbet.com.au</code> that were scraped <em>before</em> you created that mapping &mdash; those old ads are still sitting there with no category.</p>
            <p>Normalise goes back through <strong>all historical data</strong> and applies your mappings retroactively. Every ad that matches a URL or title mapping you&apos;ve set up gets the correct category, no matter how old it is. This means your reports and category counts will include the full picture, not just ads scraped after you did the categorisation work.</p>
            <p>It also cross-references between URL and title mappings. For example: if a URL mapping is marked &ldquo;unknown&rdquo; but an ad with that URL has a title you&apos;ve already categorised, it will use the title mapping to fix the URL mapping too.</p>

            <p><strong>Is it safe?</strong></p>
            <p>Yes &mdash; it never deletes anything. It only fills in blanks and fixes inconsistencies. The numbers on this page might jump around while it&apos;s running, but once it finishes the page refreshes automatically and everything will be consistent.</p>
        </>
    );
}
