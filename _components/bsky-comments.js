document.addEventListener("DOMContentLoaded", () => {
	const commentsSection = document.getElementById("comments-bsky");
	const bskyWebUrl = commentsSection?.getAttribute("data-bsky-uri");

	if (!bskyWebUrl) {
		console.warn("bluesky web url not found");
		return;
	}

	(async () => {
		try {
			const atUri = await extractAtUri(bskyWebUrl);
			console.log("Extracted AT URI:", atUri);

			const thread = await getPostThread(atUri);

			if (thread && thread.$type === "app.bsky.feed.defs#threadViewPost") {
				renderThread(thread, commentsSection);
			} else {
				commentsSection.textContent = "Error fetching comments.";
			}
		} catch (error) {
			console.error("Error loading comments:", error);
			commentsSection.textContent = "Error loading comments.";
		}
	})();
});

async function extractAtUri(webUrl) {
	try {
		const url = new URL(webUrl);
		const pathSegments = url.pathname.split("/").filter(Boolean);

		if (
			pathSegments.length < 4 ||
			pathSegments[0] !== "profile" ||
			pathSegments[2] !== "post"
		) {
			throw new Error("Invalid URL format");
		}

		const handleOrDid = pathSegments[1];
		const postID = pathSegments[3];
		let did = handleOrDid;

		if (!did.startsWith("did:")) {
			const resolveHandleURL = `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(
				handleOrDid
			)}`;
			const res = await fetch(resolveHandleURL);
			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`Failed to resolve handle to DID: ${errorText}`);
			}
			const data = await res.json();
			if (!data.did) {
				throw new Error("DID not found in response");
			}
			did = data.did;
		}

		return `at://${did}/app.bsky.feed.post/${postID}`;
	} catch (error) {
		console.error("Error extracting AT URI:", error);
		throw error;
	}
}

async function getPostThread(atUri) {
	console.log("getPostThread called with atUri:", atUri);
	const params = new URLSearchParams({ uri: atUri });
	const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?${params.toString()}`;

	console.log("API URL:", apiUrl);

	const res = await fetch(apiUrl, {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
		cache: "no-store",
	});

	if (!res.ok) {
		const errorText = await res.text();
		console.error("API Error:", errorText);
		throw new Error(`Failed to fetch post thread: ${errorText}`);
	}

	const data = await res.json();

	if (
		!data.thread ||
		data.thread.$type !== "app.bsky.feed.defs#threadViewPost"
	) {
		throw new Error("Could not find thread");
	}

	return data.thread;
}

function renderThread(thread, container) {
	const likeCountEl = container.querySelector("#likeCount");
	const repostCountEl = container.querySelector("#repostCount");
	const replyCountEl = container.querySelector("#replyCount");
	const commentPostLink = container.querySelector("#comment-post-meta-reply");

	likeCountEl.textContent = thread.post.likeCount ?? 0;
	repostCountEl.textContent = thread.post.repostCount ?? 0;
	replyCountEl.textContent = thread.post.replyCount ?? 0;

	const postAuthorImgEl = container.querySelector("#comment-post .author .avatar-img");
	const postAuthorNameEl = container.querySelector("#comment-post .author .author-name");
	const postAuthorHandleEl = container.querySelector("#comment-post .author .author-handle");
	const postAvatarLinkEl = container.querySelector("#comment-post .author .avatar-link");
	const postAuthorLinkEl = container.querySelector("#comment-post .author .author-link");
	const postDateEl = container.querySelector("#comment-post .comment-date");

	const postAuthor = thread.post.author;

	if (postAuthor) {
		postAuthorImgEl.src = postAuthor.avatar;
		postAuthorImgEl.alt = postAuthor.displayName ?? postAuthor.handle;
		postAuthorImgEl.title = postAuthor.handle;

		postAuthorNameEl.textContent = postAuthor.displayName ?? postAuthor.handle;
		postAuthorHandleEl.textContent = `@${postAuthor.handle}`;

		postAvatarLinkEl.href = `https://bsky.app/profile/${postAuthor.did}`;
		postAuthorLinkEl.href = `https://bsky.app/profile/${postAuthor.did}`;
	}

	const postTextEl = container.querySelector("#comment-post .comment-text");
	postTextEl.textContent = thread.post.record.text;

	const postUrl = `https://bsky.app/profile/${thread.post.author.did
		}/post/${thread.post.uri.split("/").pop()}`;
	commentPostLink.href = postUrl;

	postDateEl.textContent = dateInRelativeTerms(thread.post.record.createdAt);
	postDateEl.title = new Date(thread.post.record.createdAt).toLocaleString();

	const commentsContainer = container.querySelector("#comments-container");
	commentsContainer.innerHTML = "";
	if (thread.replies && thread.replies.length > 0) {
		const sortedReplies = thread.replies.sort(sortByLikes);
		for (const reply of sortedReplies.slice(0, 5)) {
			if (isThreadViewPost(reply)) {
				commentsContainer.appendChild(renderComment(reply));
			}
		}
		if (sortedReplies.length > 5) {
			const moreTag = document.createElement("a");
			moreTag.className = "more";
			moreTag.textContent = `${sortedReplies.length - 5} more`;
			moreTag.href = postUrl;
			moreTag.target = "_blank";
			commentsContainer.appendChild(moreTag);
		}
	}
}

function renderComment(comment, nested = false) {
	const { post } = comment;
	const { author } = post;

	const template = document.getElementById("comment-template");
	const commentClone = template.content.cloneNode(true);

	const avatarLink = commentClone.querySelector(".avatar-link");
	const avatarImg = commentClone.querySelector(".avatar-img");
	const authorLink = commentClone.querySelector(".author-link");
	const authorName = commentClone.querySelector(".author-name");
	const authorHandle = commentClone.querySelector(".author-handle");
	const commentText = commentClone.querySelector(".comment-text");

	avatarLink.href = `https://bsky.app/profile/${author.did}`;
	authorLink.href = `https://bsky.app/profile/${author.did}`;

	if (author.avatar) {
		avatarImg.src = author.avatar;
		avatarImg.alt = author.displayName ?? author.handle;
		avatarImg.title = author.handle;
	}

	authorName.textContent = author.displayName ?? author.handle;
	authorName.title = author.handle;
	authorHandle.textContent = `@${author.handle}`;

	commentText.textContent = post.record.text;

	// actions
	const commentReplyCountEl = commentClone.querySelector(".comment-actions .reply-count");
	const commentRepostCountEl = commentClone.querySelector(".comment-actions .repost-count");
	const commentLikeCountEl = commentClone.querySelector(".comment-actions .like-count");

	const commentDateEl = commentClone.querySelector(".comment-date");
	commentDateEl.textContent = dateInRelativeTerms(post.record.createdAt);
	commentDateEl.title = new Date(post.record.createdAt).toLocaleString();

	commentReplyCountEl.textContent = post.replyCount ?? '';
	commentRepostCountEl.textContent = post.repostCount ?? '';
	commentLikeCountEl.textContent = post.likeCount ?? '';

	const commentUrl = `https://bsky.app/profile/${author.did}/post/${post.uri
		.split("/")
		.pop()}`;

	// Nested replies
	if (comment.replies && comment.replies.length > 0 && !nested) {
		const sortedReplies = comment.replies.sort(sortByLikes);
		const nestedRepliesContainer = document.createElement("div");
		nestedRepliesContainer.className = "nested-replies";

		for (const reply of sortedReplies.slice(0, 3)) {
			if (isThreadViewPost(reply)) {
				nestedRepliesContainer.appendChild(renderComment(reply, true));
			}
		}
		if (sortedReplies.length > 3) {
			const moreTag = document.createElement("a");
			moreTag.className = "more";
			moreTag.textContent = `${sortedReplies.length - 3} more`;
			moreTag.href = commentUrl;
			moreTag.target = "_blank";
			nestedRepliesContainer.appendChild(moreTag);
		}
		if (!nested) {
			nestedRepliesContainer.appendChild(document.createElement("hr"));
		}
		commentClone.appendChild(nestedRepliesContainer);
	}

	return commentClone;
}

function sortByLikes(a, b) {
	if (!isThreadViewPost(a) || !isThreadViewPost(b)) {
		return 0;
	}
	return (b.post.likeCount ?? 0) - (a.post.likeCount ?? 0);
}

function isThreadViewPost(obj) {
	return obj && obj.$type === "app.bsky.feed.defs#threadViewPost";
}

/**
* @returns '12h', '1d', '30d', if the date is within 30 days old
* '13 July 2024' otherwise
*/
function dateInRelativeTerms(date) {
	const now = new Date();
	const postDate = new Date(date);
	const diff = now - postDate;
	const diffInDays = diff / (1000 * 60 * 60 * 24);

	if (diffInDays < 1) {
		const diffInHours = diff / (1000 * 60 * 60);
		if (diffInHours < 1) {
			const diffInMinutes = diff / (1000 * 60);
			return `${Math.floor(diffInMinutes)}m`;
		}
		return `${Math.floor(diffInHours)}h`;
	}

	if (diffInDays < 30) {
		return `${Math.floor(diffInDays)}d`;
	}

	const options = { day: "numeric", month: "short", year: "numeric" };
	return postDate.toLocaleDateString(undefined, options);
}

function replaceNewLinesWithHtmlBreaks(text) {
	return text.replace(/\n\n/g, "<br>");
}
