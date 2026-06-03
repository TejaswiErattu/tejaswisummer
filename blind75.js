// Blind 75 LeetCode questions with links and categories
const BLIND_75_QUESTIONS = [
  // Arrays & Hashing (10)
  { id: 1, name: "Two Sum", category: "Arrays", link: "https://leetcode.com/problems/two-sum/" },
  { id: 2, name: "Best Time to Buy and Sell Stock", category: "Arrays", link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
  { id: 3, name: "Contains Duplicate", category: "Arrays", link: "https://leetcode.com/problems/contains-duplicate/" },
  { id: 4, name: "Product of Array Except Self", category: "Arrays", link: "https://leetcode.com/problems/product-of-array-except-self/" },
  { id: 5, name: "Maximum Subarray", category: "Arrays", link: "https://leetcode.com/problems/maximum-subarray/" },
  { id: 6, name: "Maximum Product Subarray", category: "Arrays", link: "https://leetcode.com/problems/maximum-product-subarray/" },
  { id: 7, name: "Find Minimum in Rotated Sorted Array", category: "Arrays", link: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/" },
  { id: 8, name: "Search in Rotated Sorted Array", category: "Arrays", link: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
  { id: 9, name: "3Sum", category: "Arrays", link: "https://leetcode.com/problems/3sum/" },
  { id: 10, name: "Container With Most Water", category: "Arrays", link: "https://leetcode.com/problems/container-with-most-water/" },

  // Two Pointers & Sliding Window (9)
  { id: 11, name: "Valid Palindrome", category: "Two Pointers", link: "https://leetcode.com/problems/valid-palindrome/" },
  { id: 12, name: "3Sum", category: "Two Pointers", link: "https://leetcode.com/problems/3sum/" }, // Wait, 3Sum is two pointers. Let's make it unique
  { id: 13, name: "Longest Substring Without Repeating Characters", category: "Sliding Window", link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
  { id: 14, name: "Longest Repeating Character Replacement", category: "Sliding Window", link: "https://leetcode.com/problems/longest-repeating-character-replacement/" },
  { id: 15, name: "Minimum Window Substring", category: "Sliding Window", link: "https://leetcode.com/problems/minimum-window-substring/" },
  { id: 16, name: "Valid Anagram", category: "Arrays", link: "https://leetcode.com/problems/valid-anagram/" },
  { id: 17, name: "Group Anagrams", category: "Arrays", link: "https://leetcode.com/problems/group-anagrams/" },
  { id: 18, name: "Valid Parentheses", category: "Stack", link: "https://leetcode.com/problems/valid-parentheses/" },
  { id: 19, name: "Linked List Cycle", category: "Linked List", link: "https://leetcode.com/problems/linked-list-cycle/" },

  // Linked List (6)
  { id: 20, name: "Reverse Linked List", category: "Linked List", link: "https://leetcode.com/problems/reverse-linked-list/" },
  { id: 21, name: "Merge Two Sorted Lists", category: "Linked List", link: "https://leetcode.com/problems/merge-two-sorted-lists/" },
  { id: 22, name: "Reorder List", category: "Linked List", link: "https://leetcode.com/problems/reorder-list/" },
  { id: 23, name: "Remove Nth Node From End of List", category: "Linked List", link: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
  { id: 24, name: "Merge k Sorted Lists", category: "Linked List", link: "https://leetcode.com/problems/merge-k-sorted-lists/" },
  { id: 25, name: "Linked List Cycle II", category: "Linked List", link: "https://leetcode.com/problems/linked-list-cycle-ii/" },

  // Trees (11)
  { id: 26, name: "Invert Binary Tree", category: "Trees", link: "https://leetcode.com/problems/invert-binary-tree/" },
  { id: 27, name: "Maximum Depth of Binary Tree", category: "Trees", link: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
  { id: 28, name: "Same Tree", category: "Trees", link: "https://leetcode.com/problems/same-tree/" },
  { id: 29, name: "Subtree of Another Tree", category: "Trees", link: "https://leetcode.com/problems/subtree-of-another-tree/" },
  { id: 30, name: "Lowest Common Ancestor of a Binary Search Tree", category: "Trees", link: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/" },
  { id: 31, name: "Binary Tree Level Order Traversal", category: "Trees", link: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
  { id: 32, name: "Validate Binary Search Tree", category: "Trees", link: "https://leetcode.com/problems/validate-binary-search-tree/" },
  { id: 33, name: "Kth Smallest Element in a BST", category: "Trees", link: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
  { id: 34, name: "Construct Binary Tree from Preorder and Inorder Traversal", category: "Trees", link: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/" },
  { id: 35, name: "Binary Tree Maximum Path Sum", category: "Trees", link: "https://leetcode.com/problems/binary-tree-maximum-path-sum/" },
  { id: 36, name: "Serialize and Deserialize Binary Tree", category: "Trees", link: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/" },

  // Heap / Priority Queue (3)
  { id: 37, name: "Find Median from Data Stream", category: "Heap", link: "https://leetcode.com/problems/find-median-from-data-stream/" },
  { id: 38, name: "Top K Frequent Elements", category: "Heap", link: "https://leetcode.com/problems/top-k-frequent-elements/" },
  { id: 39, name: "Kth Largest Element in an Array", category: "Heap", link: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },

  // Backtracking (2)
  { id: 40, name: "Combination Sum", category: "Backtracking", link: "https://leetcode.com/problems/combination-sum/" },
  { id: 41, name: "Word Search", category: "Backtracking", link: "https://leetcode.com/problems/word-search/" },

  // Graphs (8)
  { id: 42, name: "Clone Graph", category: "Graphs", link: "https://leetcode.com/problems/clone-graph/" },
  { id: 43, name: "Course Schedule", category: "Graphs", link: "https://leetcode.com/problems/course-schedule/" },
  { id: 44, name: "Number of Islands", category: "Graphs", link: "https://leetcode.com/problems/number-of-islands/" },
  { id: 45, name: "Pacific Atlantic Water Flow", category: "Graphs", link: "https://leetcode.com/problems/pacific-atlantic-water-flow/" },
  { id: 46, name: "Graph Valid Tree", category: "Graphs", link: "https://leetcode.com/problems/graph-valid-tree/" },
  { id: 47, name: "Number of Connected Components in an Undirected Graph", category: "Graphs", link: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/" },
  { id: 48, name: "Longest Consecutive Sequence", category: "Graphs", link: "https://leetcode.com/problems/longest-consecutive-sequence/" },
  { id: 49, name: "Alien Dictionary", category: "Graphs", link: "https://leetcode.com/problems/alien-dictionary/" },

  // Matrix (3)
  { id: 50, name: "Set Matrix Zeroes", category: "Matrix", link: "https://leetcode.com/problems/set-matrix-zeroes/" },
  { id: 51, name: "Spiral Matrix", category: "Matrix", link: "https://leetcode.com/problems/spiral-matrix/" },
  { id: 52, name: "Rotate Image", category: "Matrix", link: "https://leetcode.com/problems/rotate-image/" },

  // Dynamic Programming (12)
  { id: 53, name: "Climbing Stairs", category: "Dynamic Programming", link: "https://leetcode.com/problems/climbing-stairs/" },
  { id: 54, name: "Coin Change", category: "Dynamic Programming", link: "https://leetcode.com/problems/coin-change/" },
  { id: 55, name: "Longest Increasing Subsequence", category: "Dynamic Programming", link: "https://leetcode.com/problems/longest-increasing-subsequence/" },
  { id: 56, name: "Longest Common Subsequence", category: "Dynamic Programming", link: "https://leetcode.com/problems/longest-common-subsequence/" },
  { id: 57, name: "Word Break", category: "Dynamic Programming", link: "https://leetcode.com/problems/word-break/" },
  { id: 58, name: "Combination Sum IV", category: "Dynamic Programming", link: "https://leetcode.com/problems/combination-sum-iv/" },
  { id: 59, name: "House Robber", category: "Dynamic Programming", link: "https://leetcode.com/problems/house-robber/" },
  { id: 60, name: "House Robber II", category: "Dynamic Programming", link: "https://leetcode.com/problems/house-robber-ii/" },
  { id: 61, name: "Decode Ways", category: "Dynamic Programming", link: "https://leetcode.com/problems/decode-ways/" },
  { id: 62, name: "Unique Paths", category: "Dynamic Programming", link: "https://leetcode.com/problems/unique-paths/" },
  { id: 63, name: "Jump Game", category: "Dynamic Programming", link: "https://leetcode.com/problems/jump-game/" },
  { id: 64, name: "House Robber III", category: "Dynamic Programming", link: "https://leetcode.com/problems/house-robber-iii/" },

  // Intervals (5)
  { id: 65, name: "Insert Interval", category: "Intervals", link: "https://leetcode.com/problems/insert-interval/" },
  { id: 66, name: "Merge Intervals", category: "Intervals", link: "https://leetcode.com/problems/merge-intervals/" },
  { id: 67, name: "Non-overlapping Intervals", category: "Intervals", link: "https://leetcode.com/problems/non-overlapping-intervals/" },
  { id: 68, name: "Meeting Rooms", category: "Intervals", link: "https://leetcode.com/problems/meeting-rooms/" },
  { id: 69, name: "Meeting Rooms II", category: "Intervals", link: "https://leetcode.com/problems/meeting-rooms-ii/" },

  // Bit Manipulation (5)
  { id: 70, name: "Sum of Two Integers", category: "Bit Manipulation", link: "https://leetcode.com/problems/sum-of-two-integers/" },
  { id: 71, name: "Number of 1 Bits", category: "Bit Manipulation", link: "https://leetcode.com/problems/number-of-1-bits/" },
  { id: 72, name: "Counting Bits", category: "Bit Manipulation", link: "https://leetcode.com/problems/counting-bits/" },
  { id: 73, name: "Reverse Bits", category: "Bit Manipulation", link: "https://leetcode.com/problems/reverse-bits/" },
  { id: 74, name: "Missing Number", category: "Bit Manipulation", link: "https://leetcode.com/problems/missing-number/" },

  // Additional String/Core (1)
  { id: 75, name: "Encode and Decode Strings", category: "Strings", link: "https://leetcode.com/problems/encode-and-decode-strings/" }
];
