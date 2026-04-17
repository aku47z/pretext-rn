#pragma once

#include <optional>
#include <string>

#include "PretextTypes.h"

namespace pretext {

double measureHeightPlatform(
    const std::string &text,
    const TextStyle &style,
    double width,
    const std::optional<int> &maxLines);

} // namespace pretext
