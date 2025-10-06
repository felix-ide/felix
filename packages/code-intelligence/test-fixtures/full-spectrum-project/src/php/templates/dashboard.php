<?php

namespace Fixture\Templates;

use function htmlspecialchars;

function render_panel(string $title, array $items): string
{
    $escaped = htmlspecialchars($title, ENT_QUOTES);
    $listMarkup = implode('', array_map(
        static fn ($item) => '<li>' . htmlspecialchars($item, ENT_QUOTES) . '</li>',
        $items
    ));

    return <<<HTML
<section class="panel">
  <h2>{$escaped}</h2>
  <ul>{$listMarkup}</ul>
</section>
HTML;
}
