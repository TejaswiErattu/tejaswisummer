// NeetCode Blind 75, in NeetCode's topic order.
//   seq  = position in this list (1..75) — the plan's sequential index
//   lc   = real LeetCode problem number (what the UI shows as "LeetCode #<lc>")
//   slug = leetcode.com/problems/<slug>/
const BLIND_75_QUESTIONS = [
  // Arrays & Hashing
  { seq: 1, lc: 217, slug: "contains-duplicate", name: "Contains Duplicate", category: "Arrays & Hashing", difficulty: "Easy", link: "https://leetcode.com/problems/contains-duplicate/" },
  { seq: 2, lc: 242, slug: "valid-anagram", name: "Valid Anagram", category: "Arrays & Hashing", difficulty: "Easy", link: "https://leetcode.com/problems/valid-anagram/" },
  { seq: 3, lc: 1, slug: "two-sum", name: "Two Sum", category: "Arrays & Hashing", difficulty: "Easy", link: "https://leetcode.com/problems/two-sum/" },
  { seq: 4, lc: 49, slug: "group-anagrams", name: "Group Anagrams", category: "Arrays & Hashing", difficulty: "Medium", link: "https://leetcode.com/problems/group-anagrams/" },
  { seq: 5, lc: 347, slug: "top-k-frequent-elements", name: "Top K Frequent Elements", category: "Arrays & Hashing", difficulty: "Medium", link: "https://leetcode.com/problems/top-k-frequent-elements/" },
  { seq: 6, lc: 271, slug: "encode-and-decode-strings", name: "Encode and Decode Strings", category: "Arrays & Hashing", difficulty: "Medium", link: "https://leetcode.com/problems/encode-and-decode-strings/" },
  { seq: 7, lc: 238, slug: "product-of-array-except-self", name: "Product of Array Except Self", category: "Arrays & Hashing", difficulty: "Medium", link: "https://leetcode.com/problems/product-of-array-except-self/" },
  { seq: 8, lc: 128, slug: "longest-consecutive-sequence", name: "Longest Consecutive Sequence", category: "Arrays & Hashing", difficulty: "Medium", link: "https://leetcode.com/problems/longest-consecutive-sequence/" },

  // Two Pointers
  { seq: 9, lc: 125, slug: "valid-palindrome", name: "Valid Palindrome", category: "Two Pointers", difficulty: "Easy", link: "https://leetcode.com/problems/valid-palindrome/" },
  { seq: 10, lc: 15, slug: "3sum", name: "3Sum", category: "Two Pointers", difficulty: "Medium", link: "https://leetcode.com/problems/3sum/" },
  { seq: 11, lc: 11, slug: "container-with-most-water", name: "Container With Most Water", category: "Two Pointers", difficulty: "Medium", link: "https://leetcode.com/problems/container-with-most-water/" },

  // Sliding Window
  { seq: 12, lc: 121, slug: "best-time-to-buy-and-sell-stock", name: "Best Time to Buy and Sell Stock", category: "Sliding Window", difficulty: "Easy", link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
  { seq: 13, lc: 3, slug: "longest-substring-without-repeating-characters", name: "Longest Substring Without Repeating Characters", category: "Sliding Window", difficulty: "Medium", link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
  { seq: 14, lc: 424, slug: "longest-repeating-character-replacement", name: "Longest Repeating Character Replacement", category: "Sliding Window", difficulty: "Medium", link: "https://leetcode.com/problems/longest-repeating-character-replacement/" },
  { seq: 15, lc: 76, slug: "minimum-window-substring", name: "Minimum Window Substring", category: "Sliding Window", difficulty: "Hard", link: "https://leetcode.com/problems/minimum-window-substring/" },

  // Stack
  { seq: 16, lc: 20, slug: "valid-parentheses", name: "Valid Parentheses", category: "Stack", difficulty: "Easy", link: "https://leetcode.com/problems/valid-parentheses/" },

  // Binary Search
  { seq: 17, lc: 153, slug: "find-minimum-in-rotated-sorted-array", name: "Find Minimum in Rotated Sorted Array", category: "Binary Search", difficulty: "Medium", link: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/" },
  { seq: 18, lc: 33, slug: "search-in-rotated-sorted-array", name: "Search in Rotated Sorted Array", category: "Binary Search", difficulty: "Medium", link: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },

  // Linked List
  { seq: 19, lc: 206, slug: "reverse-linked-list", name: "Reverse Linked List", category: "Linked List", difficulty: "Easy", link: "https://leetcode.com/problems/reverse-linked-list/" },
  { seq: 20, lc: 21, slug: "merge-two-sorted-lists", name: "Merge Two Sorted Lists", category: "Linked List", difficulty: "Easy", link: "https://leetcode.com/problems/merge-two-sorted-lists/" },
  { seq: 21, lc: 143, slug: "reorder-list", name: "Reorder List", category: "Linked List", difficulty: "Medium", link: "https://leetcode.com/problems/reorder-list/" },
  { seq: 22, lc: 19, slug: "remove-nth-node-from-end-of-list", name: "Remove Nth Node From End of List", category: "Linked List", difficulty: "Medium", link: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
  { seq: 23, lc: 141, slug: "linked-list-cycle", name: "Linked List Cycle", category: "Linked List", difficulty: "Easy", link: "https://leetcode.com/problems/linked-list-cycle/" },
  { seq: 24, lc: 23, slug: "merge-k-sorted-lists", name: "Merge k Sorted Lists", category: "Linked List", difficulty: "Hard", link: "https://leetcode.com/problems/merge-k-sorted-lists/" },

  // Trees
  { seq: 25, lc: 226, slug: "invert-binary-tree", name: "Invert Binary Tree", category: "Trees", difficulty: "Easy", link: "https://leetcode.com/problems/invert-binary-tree/" },
  { seq: 26, lc: 104, slug: "maximum-depth-of-binary-tree", name: "Maximum Depth of Binary Tree", category: "Trees", difficulty: "Easy", link: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
  { seq: 27, lc: 100, slug: "same-tree", name: "Same Tree", category: "Trees", difficulty: "Easy", link: "https://leetcode.com/problems/same-tree/" },
  { seq: 28, lc: 572, slug: "subtree-of-another-tree", name: "Subtree of Another Tree", category: "Trees", difficulty: "Easy", link: "https://leetcode.com/problems/subtree-of-another-tree/" },
  { seq: 29, lc: 235, slug: "lowest-common-ancestor-of-a-binary-search-tree", name: "Lowest Common Ancestor of a Binary Search Tree", category: "Trees", difficulty: "Medium", link: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/" },
  { seq: 30, lc: 102, slug: "binary-tree-level-order-traversal", name: "Binary Tree Level Order Traversal", category: "Trees", difficulty: "Medium", link: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
  { seq: 31, lc: 98, slug: "validate-binary-search-tree", name: "Validate Binary Search Tree", category: "Trees", difficulty: "Medium", link: "https://leetcode.com/problems/validate-binary-search-tree/" },
  { seq: 32, lc: 230, slug: "kth-smallest-element-in-a-bst", name: "Kth Smallest Element in a BST", category: "Trees", difficulty: "Medium", link: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
  { seq: 33, lc: 105, slug: "construct-binary-tree-from-preorder-and-inorder-traversal", name: "Construct Binary Tree from Preorder and Inorder Traversal", category: "Trees", difficulty: "Medium", link: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/" },
  { seq: 34, lc: 124, slug: "binary-tree-maximum-path-sum", name: "Binary Tree Maximum Path Sum", category: "Trees", difficulty: "Hard", link: "https://leetcode.com/problems/binary-tree-maximum-path-sum/" },
  { seq: 35, lc: 297, slug: "serialize-and-deserialize-binary-tree", name: "Serialize and Deserialize Binary Tree", category: "Trees", difficulty: "Hard", link: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/" },

  // Tries
  { seq: 36, lc: 208, slug: "implement-trie-prefix-tree", name: "Implement Trie (Prefix Tree)", category: "Tries", difficulty: "Medium", link: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
  { seq: 37, lc: 211, slug: "design-add-and-search-words-data-structure", name: "Design Add and Search Words Data Structure", category: "Tries", difficulty: "Medium", link: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
  { seq: 38, lc: 212, slug: "word-search-ii", name: "Word Search II", category: "Tries", difficulty: "Hard", link: "https://leetcode.com/problems/word-search-ii/" },

  // Heap / Priority Queue
  { seq: 39, lc: 295, slug: "find-median-from-data-stream", name: "Find Median from Data Stream", category: "Heap / Priority Queue", difficulty: "Hard", link: "https://leetcode.com/problems/find-median-from-data-stream/" },

  // Backtracking
  { seq: 40, lc: 39, slug: "combination-sum", name: "Combination Sum", category: "Backtracking", difficulty: "Medium", link: "https://leetcode.com/problems/combination-sum/" },
  { seq: 41, lc: 79, slug: "word-search", name: "Word Search", category: "Backtracking", difficulty: "Medium", link: "https://leetcode.com/problems/word-search/" },

  // Graphs
  { seq: 42, lc: 200, slug: "number-of-islands", name: "Number of Islands", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/number-of-islands/" },
  { seq: 43, lc: 133, slug: "clone-graph", name: "Clone Graph", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/clone-graph/" },
  { seq: 44, lc: 417, slug: "pacific-atlantic-water-flow", name: "Pacific Atlantic Water Flow", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/pacific-atlantic-water-flow/" },
  { seq: 45, lc: 207, slug: "course-schedule", name: "Course Schedule", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/course-schedule/" },
  { seq: 46, lc: 323, slug: "number-of-connected-components-in-an-undirected-graph", name: "Number of Connected Components in an Undirected Graph", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/" },
  { seq: 47, lc: 261, slug: "graph-valid-tree", name: "Graph Valid Tree", category: "Graphs", difficulty: "Medium", link: "https://leetcode.com/problems/graph-valid-tree/" },

  // Advanced Graphs
  { seq: 48, lc: 269, slug: "alien-dictionary", name: "Alien Dictionary", category: "Advanced Graphs", difficulty: "Hard", link: "https://leetcode.com/problems/alien-dictionary/" },

  // 1-D Dynamic Programming
  { seq: 49, lc: 70, slug: "climbing-stairs", name: "Climbing Stairs", category: "1-D Dynamic Programming", difficulty: "Easy", link: "https://leetcode.com/problems/climbing-stairs/" },
  { seq: 50, lc: 198, slug: "house-robber", name: "House Robber", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/house-robber/" },
  { seq: 51, lc: 213, slug: "house-robber-ii", name: "House Robber II", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/house-robber-ii/" },
  { seq: 52, lc: 5, slug: "longest-palindromic-substring", name: "Longest Palindromic Substring", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/longest-palindromic-substring/" },
  { seq: 53, lc: 647, slug: "palindromic-substrings", name: "Palindromic Substrings", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/palindromic-substrings/" },
  { seq: 54, lc: 91, slug: "decode-ways", name: "Decode Ways", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/decode-ways/" },
  { seq: 55, lc: 322, slug: "coin-change", name: "Coin Change", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/coin-change/" },
  { seq: 56, lc: 152, slug: "maximum-product-subarray", name: "Maximum Product Subarray", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/maximum-product-subarray/" },
  { seq: 57, lc: 139, slug: "word-break", name: "Word Break", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/word-break/" },
  { seq: 58, lc: 300, slug: "longest-increasing-subsequence", name: "Longest Increasing Subsequence", category: "1-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/longest-increasing-subsequence/" },

  // 2-D Dynamic Programming
  { seq: 59, lc: 62, slug: "unique-paths", name: "Unique Paths", category: "2-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/unique-paths/" },
  { seq: 60, lc: 1143, slug: "longest-common-subsequence", name: "Longest Common Subsequence", category: "2-D Dynamic Programming", difficulty: "Medium", link: "https://leetcode.com/problems/longest-common-subsequence/" },

  // Greedy
  { seq: 61, lc: 53, slug: "maximum-subarray", name: "Maximum Subarray", category: "Greedy", difficulty: "Medium", link: "https://leetcode.com/problems/maximum-subarray/" },
  { seq: 62, lc: 55, slug: "jump-game", name: "Jump Game", category: "Greedy", difficulty: "Medium", link: "https://leetcode.com/problems/jump-game/" },

  // Intervals
  { seq: 63, lc: 57, slug: "insert-interval", name: "Insert Interval", category: "Intervals", difficulty: "Medium", link: "https://leetcode.com/problems/insert-interval/" },
  { seq: 64, lc: 56, slug: "merge-intervals", name: "Merge Intervals", category: "Intervals", difficulty: "Medium", link: "https://leetcode.com/problems/merge-intervals/" },
  { seq: 65, lc: 435, slug: "non-overlapping-intervals", name: "Non-overlapping Intervals", category: "Intervals", difficulty: "Medium", link: "https://leetcode.com/problems/non-overlapping-intervals/" },
  { seq: 66, lc: 252, slug: "meeting-rooms", name: "Meeting Rooms", category: "Intervals", difficulty: "Easy", link: "https://leetcode.com/problems/meeting-rooms/" },
  { seq: 67, lc: 253, slug: "meeting-rooms-ii", name: "Meeting Rooms II", category: "Intervals", difficulty: "Medium", link: "https://leetcode.com/problems/meeting-rooms-ii/" },

  // Math & Geometry
  { seq: 68, lc: 48, slug: "rotate-image", name: "Rotate Image", category: "Math & Geometry", difficulty: "Medium", link: "https://leetcode.com/problems/rotate-image/" },
  { seq: 69, lc: 54, slug: "spiral-matrix", name: "Spiral Matrix", category: "Math & Geometry", difficulty: "Medium", link: "https://leetcode.com/problems/spiral-matrix/" },
  { seq: 70, lc: 73, slug: "set-matrix-zeroes", name: "Set Matrix Zeroes", category: "Math & Geometry", difficulty: "Medium", link: "https://leetcode.com/problems/set-matrix-zeroes/" },

  // Bit Manipulation
  { seq: 71, lc: 191, slug: "number-of-1-bits", name: "Number of 1 Bits", category: "Bit Manipulation", difficulty: "Easy", link: "https://leetcode.com/problems/number-of-1-bits/" },
  { seq: 72, lc: 338, slug: "counting-bits", name: "Counting Bits", category: "Bit Manipulation", difficulty: "Easy", link: "https://leetcode.com/problems/counting-bits/" },
  { seq: 73, lc: 190, slug: "reverse-bits", name: "Reverse Bits", category: "Bit Manipulation", difficulty: "Easy", link: "https://leetcode.com/problems/reverse-bits/" },
  { seq: 74, lc: 268, slug: "missing-number", name: "Missing Number", category: "Bit Manipulation", difficulty: "Easy", link: "https://leetcode.com/problems/missing-number/" },
  { seq: 75, lc: 371, slug: "sum-of-two-integers", name: "Sum of Two Integers", category: "Bit Manipulation", difficulty: "Medium", link: "https://leetcode.com/problems/sum-of-two-integers/" }
];

const BLIND_75_BY_LC = {};
BLIND_75_QUESTIONS.forEach(q => { BLIND_75_BY_LC[q.lc] = q; });

// Microsoft OA prep override for the week leading up to the OA on 2026-08-17.
// On these dates, Blind 75 is suspended and replaced with the problems below.
// Blind 75 sequential index does NOT advance across these dates.
const MICROSOFT_OA_OVERRIDE = {
  "2026-08-11": [
    { id: 1, name: "Two Sum", link: "https://leetcode.com/problems/two-sum/" },
    { id: 242, name: "Valid Anagram", link: "https://leetcode.com/problems/valid-anagram/" },
    { id: 49, name: "Group Anagrams", link: "https://leetcode.com/problems/group-anagrams/" },
    { id: 238, name: "Product of Array Except Self", link: "https://leetcode.com/problems/product-of-array-except-self/" },
    { id: 128, name: "Longest Consecutive Sequence", link: "https://leetcode.com/problems/longest-consecutive-sequence/" },
    { id: 15, name: "3Sum", link: "https://leetcode.com/problems/3sum/" }
  ],
  "2026-08-12": [
    { id: 3, name: "Longest Substring Without Repeating Characters", link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: 567, name: "Permutation in String", link: "https://leetcode.com/problems/permutation-in-string/" },
    { id: 1004, name: "Max Consecutive Ones III", link: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
    { id: 438, name: "Find All Anagrams in a String", link: "https://leetcode.com/problems/find-all-anagrams-in-a-string/" },
    { id: 424, name: "Longest Repeating Character Replacement", link: "https://leetcode.com/problems/longest-repeating-character-replacement/" },
    { id: 76, name: "Minimum Window Substring", link: "https://leetcode.com/problems/minimum-window-substring/" }
  ],
  "2026-08-13": [
    { id: 200, name: "Number of Islands", link: "https://leetcode.com/problems/number-of-islands/" },
    { id: 994, name: "Rotting Oranges", link: "https://leetcode.com/problems/rotting-oranges/" },
    { id: 752, name: "Open the Lock", link: "https://leetcode.com/problems/open-the-lock/" },
    { id: 207, name: "Course Schedule", link: "https://leetcode.com/problems/course-schedule/" },
    { id: 1466, name: "Reorder Routes to Make All Paths Lead to City Zero", link: "https://leetcode.com/problems/reorder-routes-to-make-all-paths-lead-to-the-city-zero/" },
    { id: 133, name: "Clone Graph", link: "https://leetcode.com/problems/clone-graph/" }
  ],
  "2026-08-14": [
    { id: 198, name: "House Robber", link: "https://leetcode.com/problems/house-robber/" },
    { id: 322, name: "Coin Change", link: "https://leetcode.com/problems/coin-change/" },
    { id: 416, name: "Partition Equal Subset Sum", link: "https://leetcode.com/problems/partition-equal-subset-sum/" },
    { id: 62, name: "Unique Paths", link: "https://leetcode.com/problems/unique-paths/" },
    { id: 300, name: "Longest Increasing Subsequence", link: "https://leetcode.com/problems/longest-increasing-subsequence/" },
    { id: 91, name: "Decode Ways", link: "https://leetcode.com/problems/decode-ways/" }
  ],
  "2026-08-15": [
    { id: 206, name: "Reverse Linked List", link: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: 102, name: "Binary Tree Level Order Traversal", link: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
    { id: 98, name: "Validate Binary Search Tree", link: "https://leetcode.com/problems/validate-binary-search-tree/" },
    { id: 155, name: "Min Stack", link: "https://leetcode.com/problems/min-stack/" },
    { id: 215, name: "Kth Largest Element in an Array", link: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
    { id: 2246, name: "Longest Path With Different Adjacent Characters", link: "https://leetcode.com/problems/longest-path-with-different-adjacent-characters/" }
  ],
  "2026-08-16": [
    { id: 1797, name: "Design Authentication Manager", link: "https://leetcode.com/problems/design-authentication-manager/" },
    { id: 146, name: "LRU Cache", link: "https://leetcode.com/problems/lru-cache/" },
    { id: 347, name: "Top K Frequent Elements", link: "https://leetcode.com/problems/top-k-frequent-elements/" },
    { id: 56, name: "Merge Intervals", link: "https://leetcode.com/problems/merge-intervals/" },
    { id: 134, name: "Gas Station", link: "https://leetcode.com/problems/gas-station/" },
    { id: 621, name: "Task Scheduler", link: "https://leetcode.com/problems/task-scheduler/" }
  ],
  "2026-08-17": [
    { id: 1797, name: "MS OA Sim — Redo: Design Authentication Manager", link: "https://leetcode.com/problems/design-authentication-manager/" },
    { id: 3, name: "MS OA Sim — Redo: Longest Substring Without Repeating Characters", link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: 567, name: "MS OA Sim — Redo: Permutation in String", link: "https://leetcode.com/problems/permutation-in-string/" },
    { id: 994, name: "MS OA Sim — Redo: Rotting Oranges", link: "https://leetcode.com/problems/rotting-oranges/" },
    { id: 1466, name: "MS OA Sim — Redo: Reorder Routes to Make All Paths Lead to City Zero", link: "https://leetcode.com/problems/reorder-routes-to-make-all-paths-lead-to-the-city-zero/" },
    { id: 416, name: "MS OA Sim — Redo: Partition Equal Subset Sum", link: "https://leetcode.com/problems/partition-equal-subset-sum/" }
  ]
};
